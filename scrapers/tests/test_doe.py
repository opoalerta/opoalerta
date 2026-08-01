"""Tests offline del scraper del DOE (Extremadura) — fixture, sin red."""

from datetime import date
from pathlib import Path

import pytest

from common.schema import is_valid
from doe import _TIENE_CONTENIDO_RE, DoeScraper, _tipo_acceso

FIXTURE = Path(__file__).parent / "fixtures" / "doe-sumario.html"


@pytest.fixture
def raw():
    return FIXTURE.read_text(encoding="utf-8")


def test_parse_seccion_oposiciones(raw):
    registros = DoeScraper(fecha=date(2026, 7, 22)).parse(raw)
    assert len(registros) >= 1
    assert all(r["organismo"] for r in registros)
    assert all(r["xml"].isdigit() for r in registros)


def test_run_produce_convocatorias_validas(raw):
    convocatorias = DoeScraper(fecha=date(2026, 7, 22)).run(raw=raw)
    assert convocatorias
    for c in convocatorias:
        assert is_valid(c), c
        assert c["id"].startswith("doe:")
        assert c["ccaa"] == "EX"
        assert c["ambito"] == "autonomico"
        assert c["fuente"]["codigo"] == "doe"
        assert c["fecha_publicacion"] == "2026-07-22"
        assert c["url_oficial"].startswith("https://doe.juntaex.es/otrosFormatos/html.php")


def test_dia_sin_oposiciones_devuelve_vacio():
    sumario = "<html>mostrardoe SUMARIO II. AUTORIDADES Y PERSONAL sin subsección</html>"
    assert DoeScraper().parse(sumario) == []


def test_vacio_devuelve_vacio():
    assert DoeScraper().parse("") == []


def test_fragmento_incorrecto_falla():
    with pytest.raises(ValueError):
        DoeScraper().parse("<div>Otra cosa cualquiera</div>")


def test_detecta_un_sumario_real_por_sus_bloques_doe2():
    """
    Regresión de #71.

    La portada listaba las fechas como `mostrardoe.php?fecha=YYYYMMDD` hasta que
    un rediseño las sustituyó por un formulario de mes y año, y la ingesta se
    cayó. Ahora se prueba día a día, y un día sin boletín se distingue porque
    devuelve la misma página sin ningún bloque `DOE2`.
    """
    con_boletin = '<p><span class="DOE2">CONSEJERÍA DE HACIENDA</span></p>'
    sin_boletin = "<html>No se ha publicado DOE en la fecha seleccionada</html>"
    assert _TIENE_CONTENIDO_RE.search(con_boletin)
    assert not _TIENE_CONTENIDO_RE.search(sin_boletin)


@pytest.mark.parametrize(
    ("titulo", "esperado"),
    [
        # El epígrafe del DOE va en plural y no casaba con el singular, así que
        # estas convocatorias se publicaban sin clasificar.
        ("Procesos selectivos.- Resolución de 23 de julio de 2026", "oposicion"),
        ("Proceso selectivo de auxiliar administrativo", "oposicion"),
        ("Oposiciones libres de administrativo", "oposicion"),
        ("Concurso-oposición para diez plazas", "concurso_oposicion"),
        ("Bolsa de trabajo de peón", "bolsa"),
        ("Anuncio de licitación", None),
    ],
)
def test_tipo_acceso(titulo, esperado):
    assert _tipo_acceso(titulo) == esperado
