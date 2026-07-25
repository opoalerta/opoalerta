"""Tests offline del scraper del BOIB (Illes Balears) — usa una fixture, sin red."""

import re
from datetime import date
from pathlib import Path

import pytest

from boib import BoibScraper
from common.schema import is_valid

FIXTURE = Path(__file__).parent / "fixtures" / "boib-seccion.html"


@pytest.fixture
def raw():
    return FIXTURE.read_text(encoding="utf-8")


def test_parse_items_con_registro(raw):
    registros = BoibScraper(fecha=date(2026, 7, 25)).parse(raw)
    assert len(registros) >= 2
    assert all(r["reg"].isdigit() for r in registros)
    assert all(r["organismo"] for r in registros)


def test_run_produce_convocatorias_validas(raw):
    convocatorias = BoibScraper(fecha=date(2026, 7, 25)).run(raw=raw)
    assert convocatorias
    for c in convocatorias:
        assert is_valid(c), c
        assert re.fullmatch(r"boib:2026-\d+", c["id"])
        assert c["ccaa"] == "IB"
        assert c["ambito"] == "autonomico"
        assert c["fuente"]["codigo"] == "boib"
        assert c["url_oficial"].startswith("https://www.caib.es/")


def test_sin_seccion_oposiciones_devuelve_vacio():
    assert BoibScraper().parse("<html><body>Otra cosa</body></html>") == []
