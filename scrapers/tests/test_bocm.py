"""Tests offline del scraper del BOCM (usa una fixture, sin acceso a la red).

La fixture es el sumario real del 10 de agosto de 2026, recortado a 10
disposiciones que cubren los cuatro bloques que trae el XML: el apartado
«B) Autoridades y Personal» de la Comunidad, los apartados C y D de esa misma
sección, y la sección «III. ADMINISTRACIÓN LOCAL AYUNTAMIENTOS», cuyo apartado
viene sin nombre.

Antes la fixture solo llevaba disposiciones del apartado B, así que el filtro
no se ejercitaba: un filtro que dejara pasar el sumario entero habría dado
exactamente el mismo resultado. Es el fallo que estuvo semanas vivo en el BOA
(#93), y aquí no lo habríamos visto.
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


def test_parse_solo_apartado_b(raw):
    registros = BocmScraper().parse(raw)
    # 10 disposiciones en la fixture, 3 en «B) Autoridades y Personal».
    assert [r["identificador"] for r in registros] == [
        "BOCM-20260810-1",
        "BOCM-20260810-2",
        "BOCM-20260810-3",
    ]
    assert all(r["organismo"] for r in registros)


def test_descarta_los_demas_apartados(raw):
    titulos = " ".join(r["titulo"] for r in BocmScraper().parse(raw))
    # C) Otras Disposiciones y D) Anuncios quedan fuera.
    assert "Concesión ayudas" not in titulos
    assert "Notificación" not in titulos
    assert "Convenio" not in titulos


def test_el_filtro_de_apartado_hace_algo(raw):
    """Sin filtro tienen que salir más registros que con él.

    Es la comprobación que le faltaba a este scraper: verifica que el filtro
    descarta algo de verdad, no que la fixture venga ya filtrada de casa.
    """
    con_filtro = len(BocmScraper().parse(raw))
    original = bocm.APARTADO_OPOSICIONES
    bocm.APARTADO_OPOSICIONES = ""  # "" está en cualquier cadena → filtro nulo
    try:
        sin_filtro = len(BocmScraper().parse(raw))
    finally:
        bocm.APARTADO_OPOSICIONES = original
    assert con_filtro == 3
    assert sin_filtro == 10


def test_ayuntamientos_quedan_fuera(raw):
    """La sección III (ayuntamientos) se pierde entera. Es un fallo conocido.

    Su apartado viene sin atributo `nombre`, así que el filtro la descarta junto
    con los anuncios. En el sumario del que sale esta fixture, la sección III
    traía convocatorias de Móstoles, Alcorcón y San Sebastián de los Reyes.

    El test fija el comportamiento actual para que el día que se arregle salte
    y haya que actualizarlo a conciencia, no para bendecirlo.
    """
    registros = BocmScraper().parse(raw)
    assert not any("Móstoles" in r["titulo"] for r in registros)
    assert all(r["organismo"].startswith("CONSEJERÍA") for r in registros)


def test_run_produce_convocatorias_validas(raw):
    convocatorias = BocmScraper().run(raw=raw)
    assert len(convocatorias) == 3
    for c in convocatorias:
        assert is_valid(c), c
        assert c["id"].startswith("bocm:BOCM-")
        assert c["ambito"] == "autonomico"
        assert c["ccaa"] == "MD"
        assert c["fuente"]["codigo"] == "bocm"
        assert re.match(r"\d{4}-\d{2}-\d{2}", c["fecha_publicacion"])
        assert c["url_oficial"].startswith("https://www.bocm.es/")


def test_xml_no_sumario_falla():
    with pytest.raises(ValueError):
        BocmScraper().parse("<html><body>no soy un sumario</body></html>")
