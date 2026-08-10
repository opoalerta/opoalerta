"""Tests offline del scraper del BOA (Aragón) — usa una fixture, sin red.

La fixture es el sumario real del BOA del 7 de agosto de 2026, recortado a sus
encabezados y enlaces: 29 documentos repartidos en las secciones I, II.a, II.b,
III y V. Solo 3 están en «II.b Oposiciones y concursos». Los otros 26 son
nombramientos, subvenciones y anuncios de información pública que el scraper
guardaba como convocatorias hasta que se añadió el filtro por sección.
"""

import re
from datetime import date
from pathlib import Path

import pytest

from boa import BoaScraper
from common.schema import is_valid

FIXTURE = Path(__file__).parent / "fixtures" / "boa-lista.html"


@pytest.fixture
def raw():
    return FIXTURE.read_text(encoding="utf-8")


def test_solo_recoge_la_subseccion_de_oposiciones(raw):
    registros = BoaScraper(fecha=date(2026, 8, 7)).parse(raw)
    # 29 documentos en el boletín, 3 en «II.b Oposiciones y concursos».
    assert [r["docr"] for r in registros] == ["8", "9", "10"]
    # El emisor se hereda para los títulos que van bajo el mismo organismo.
    assert registros[0]["organismo"].startswith("DEPARTAMENTO DE HACIENDA")
    assert registros[1]["organismo"].startswith("DEPARTAMENTO DE HACIENDA")
    assert registros[2]["organismo"] == "UNIVERSIDAD DE ZARAGOZA"


def test_descarta_lo_que_no_es_empleo_publico(raw):
    titulos = " ".join(r["titulo"] for r in BoaScraper(fecha=date(2026, 8, 7)).parse(raw))
    # Subvenciones (sección I y III), nombramientos ya resueltos (II.a) y
    # expedientes de información pública (V) quedan fuera.
    assert "bases reguladoras para la concesión de ayudas" not in titulos
    assert "se nombran miembros del Consejo de Transparencia" not in titulos
    assert "se somete a información pública" not in titulos
    assert "Instituto Aragonés de Gestión Ambiental" not in titulos


def test_run_produce_convocatorias_validas(raw):
    convocatorias = BoaScraper(fecha=date(2026, 8, 7)).run(raw=raw)
    assert len(convocatorias) == 3
    for c in convocatorias:
        assert is_valid(c), c
        assert re.fullmatch(r"boa:20260807-\d+", c["id"])
        assert c["ccaa"] == "AR"
        assert c["ambito"] == "autonomico"
        assert c["fuente"]["codigo"] == "boa"
        assert c["fecha_publicacion"] == "2026-08-07"
        assert c["url_oficial"].startswith("https://www.boa.aragon.es/")


def test_dia_sin_boletin_devuelve_vacio():
    # Página de inicio del BOA (sin "Lista de documentos") → 0, sin error.
    assert BoaScraper().parse("<html><body>Buscar en BOA</body></html>") == []


def test_lista_sin_items_falla():
    # Hay lista pero no se parsea nada → probable cambio de formato.
    with pytest.raises(ValueError):
        BoaScraper().parse("<html><body>Lista de documentos (1-5/5) sin estructura</body></html>")


def test_boletin_sin_secciones_falla(raw):
    # Si el BOA dejara de marcar las secciones, el filtro vaciaría el boletín
    # entero en silencio. Preferimos el error, que sí dispara la alerta.
    sin_secciones = re.sub(r'<h2 class="boaseccion">.*?</h2>', "", raw, flags=re.S)
    with pytest.raises(ValueError):
        BoaScraper(fecha=date(2026, 8, 7)).parse(sin_secciones)


def test_dia_con_boletin_pero_sin_oposiciones(raw):
    # Un boletín sin subsección II.b es normal (muchos días no traen ninguna):
    # devuelve 0 convocatorias sin considerarlo un fallo del scraper.
    sin_ub = raw.replace('<h3 class="boasubseccion">b) Oposiciones y concursos<h3>', "")
    assert BoaScraper(fecha=date(2026, 8, 7)).parse(sin_ub) == []
