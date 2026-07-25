"""Tests offline del scraper del BOCM (usa una fixture, sin acceso a la red)."""

import re
from pathlib import Path

import pytest

from bocm import BocmScraper
from common.schema import is_valid

FIXTURE = Path(__file__).parent / "fixtures" / "bocm-sumario.xml"


@pytest.fixture
def raw():
    return FIXTURE.read_text(encoding="utf-8")


def test_parse_solo_apartado_b(raw):
    registros = BocmScraper().parse(raw)
    assert len(registros) >= 1
    assert all(r["identificador"].startswith("BOCM-") for r in registros)
    assert all(r["organismo"] for r in registros)


def test_run_produce_convocatorias_validas(raw):
    convocatorias = BocmScraper().run(raw=raw)
    assert convocatorias
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
