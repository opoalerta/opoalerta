"""Tests offline del scraper del BOCM (usa una fixture, sin acceso a la red).

La fixture son los sumarios reales del 7 y el 10 de agosto de 2026, recortados a
13 disposiciones que cubren los casos que el filtro tiene que distinguir:

- Sección I, apartado «B) Autoridades y Personal» → entra, ámbito autonómico.
- Sección I, apartados C y D → fuera.
- Sección III (ayuntamientos), categoría «Ofertas de empleo» → entra, ámbito local.
- Sección III, categorías `Urbanismo`, `Régimen económico`, `Personal` → fuera.
- Sección III, una convocatoria mal archivada bajo `Régimen económico` cuya
  subcategoría sí dice «Convocatoria proceso selectivo» → entra.

Antes la fixture solo llevaba disposiciones del apartado B, así que el filtro no
se ejercitaba: uno que dejara pasar el sumario entero habría dado exactamente el
mismo resultado. Es la forma del fallo que estuvo semanas vivo en el BOA (#93).
"""

import re
from pathlib import Path

import pytest

import bocm
from bocm import BocmScraper
from common.schema import is_valid

FIXTURE = Path(__file__).parent / "fixtures" / "bocm-sumario.xml"


@pytest.fixture
def raw():
    return FIXTURE.read_text(encoding="utf-8")


@pytest.fixture
def registros(raw):
    return BocmScraper().parse(raw)


def test_recoge_comunidad_y_ayuntamientos(registros):
    # 13 disposiciones en la fixture: 3 del apartado B y 3 de la sección III.
    assert len(registros) == 6
    assert sum(r["ambito"] == "autonomico" for r in registros) == 3
    assert sum(r["ambito"] == "local" for r in registros) == 3
    assert all(r["organismo"] for r in registros)


def test_descarta_los_demas_apartados_de_la_comunidad(registros):
    titulos = " ".join(r["titulo"] for r in registros)
    assert "Concesión ayudas" not in titulos  # C) Otras Disposiciones
    assert "Notificación" not in titulos  # D) Anuncios


def test_descarta_lo_que_no_es_empleo_en_los_ayuntamientos(registros):
    titulos = " ".join(r["titulo"] for r in registros)
    assert "Urbanismo" not in titulos
    assert "Ordenanza fiscal" not in titulos
    # `Personal` son plantillas, RPT y nombramientos ya resueltos: no se puede
    # uno presentar a ninguno, igual que al II.a del BOA.
    assert "Plantilla personal" not in titulos


def test_rescata_la_convocatoria_mal_archivada(registros):
    # El BOCM archivó una «Convocatoria proceso selectivo» bajo Régimen
    # económico. La salva la subcategoría, que también es vocabulario suyo.
    coslada = [r for r in registros if r["organismo"] == "COSLADA"]
    assert len(coslada) == 1
    assert coslada[0]["ambito"] == "local"


def test_organismo_local_sale_del_titulo_si_falta_en_el_xml(raw):
    # Hay días en que el <organismo> de la sección III viene sin `nombre`. Sin
    # respaldo, esas convocatorias acabarían atribuidas a la Comunidad de
    # Madrid, que es sencillamente falso para un ayuntamiento.
    sin_nombre = raw.replace('<organismo nombre="MÓSTOLES">', "<organismo>")
    locales = [r for r in BocmScraper().parse(sin_nombre) if r["ambito"] == "local"]
    mostoles = [r for r in locales if "Móstoles" in r["titulo"]]
    assert mostoles
    assert all(r["organismo"] == "Ayuntamiento de Móstoles" for r in mostoles)


def test_limpia_el_guion_de_los_titulos_locales(registros):
    locales = [r for r in registros if r["ambito"] == "local"]
    assert locales
    assert not any(r["titulo"].startswith("–") for r in locales)
    assert any(r["titulo"].startswith("Móstoles. Ofertas de empleo") for r in locales)


def test_el_filtro_hace_algo(raw):
    """Sin filtro tienen que salir más registros que con él.

    Es la comprobación que le faltaba a este scraper: verifica que el filtro
    descarta algo de verdad, no que la fixture venga ya filtrada de casa.
    """
    con_filtro = len(BocmScraper().parse(raw))
    originales = (bocm.APARTADO_OPOSICIONES, bocm._SUBCATEGORIA_EMPLEO_RE)
    # Filtro nulo en los dos frentes: "" está contenido en cualquier cadena y
    # una expresión vacía casa con cualquier subcategoría.
    bocm.APARTADO_OPOSICIONES = ""
    bocm._SUBCATEGORIA_EMPLEO_RE = re.compile("")
    try:
        sin_filtro = len(BocmScraper().parse(raw))
    finally:
        bocm.APARTADO_OPOSICIONES, bocm._SUBCATEGORIA_EMPLEO_RE = originales
    assert con_filtro == 6
    assert sin_filtro == 13


def test_run_produce_convocatorias_validas(raw):
    convocatorias = BocmScraper().run(raw=raw)
    assert len(convocatorias) == 6
    for c in convocatorias:
        assert is_valid(c), c
        assert c["id"].startswith("bocm:BOCM-")
        assert c["ambito"] in ("autonomico", "local")
        assert c["ccaa"] == "MD"
        assert c["fuente"]["codigo"] == "bocm"
        assert re.match(r"\d{4}-\d{2}-\d{2}", c["fecha_publicacion"])
        assert c["url_oficial"].startswith("https://www.bocm.es/")


def test_xml_no_sumario_falla():
    with pytest.raises(ValueError):
        BocmScraper().parse("<html><body>no soy un sumario</body></html>")
