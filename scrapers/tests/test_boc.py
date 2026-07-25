"""Tests offline del scraper del BOC (Canarias) — fixture, sin red."""

from datetime import date
from pathlib import Path

import pytest

from boc import BocScraper
from common.schema import is_valid

FIXTURE = Path(__file__).parent / "fixtures" / "boc-sumario.html"


@pytest.fixture
def raw():
    return FIXTURE.read_text(encoding="utf-8")


def test_parse_solo_seccion_oposiciones(raw):
    registros = BocScraper(fecha=date(2026, 7, 22)).parse(raw)
    assert len(registros) >= 1
    # El artículo de "Nombramientos" (2600) queda fuera de la sección.
    assert all(r["disp"] != "2600" for r in registros)
    assert all(r["organismo"] for r in registros)


def test_run_produce_convocatorias_validas(raw):
    convocatorias = BocScraper(fecha=date(2026, 7, 22)).run(raw=raw)
    assert convocatorias
    for c in convocatorias:
        assert is_valid(c), c
        assert c["id"].startswith("boc:2026-146-")
        assert c["ccaa"] == "CN"
        assert c["ambito"] == "autonomico"
        assert c["fuente"]["codigo"] == "boc"
        assert c["fecha_publicacion"] == "2026-07-22"
        assert c["url_oficial"].startswith("https://www.gobiernodecanarias.org/boc/2026/146/")


def test_dia_sin_oposiciones_devuelve_vacio():
    sumario = '<h4>II. Autoridades y personal</h4><h3 class="titboc">Otros anuncios</h3>'
    assert BocScraper().parse(sumario) == []


def test_vacio_devuelve_vacio():
    assert BocScraper().parse("") == []


def test_fragmento_incorrecto_falla():
    with pytest.raises(ValueError):
        BocScraper().parse("<div>Cualquier otra cosa</div>")
