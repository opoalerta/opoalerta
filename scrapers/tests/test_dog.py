"""Tests offline del scraper del DOG (Galicia) — fixture, sin red."""

from datetime import date
from pathlib import Path

import pytest

from common.schema import is_valid
from dog import DogScraper

FIXTURE = Path(__file__).parent / "fixtures" / "dog-seccion.html"


@pytest.fixture
def raw():
    return FIXTURE.read_text(encoding="utf-8")


def test_parse_items_con_organismo(raw):
    registros = DogScraper(fecha=date(2026, 7, 24)).parse(raw)
    assert len(registros) >= 1
    assert all(r["organismo"] for r in registros)
    assert all(r["id_dog"].startswith("Anuncio") for r in registros)


def test_run_produce_convocatorias_validas(raw):
    convocatorias = DogScraper(fecha=date(2026, 7, 24)).run(raw=raw)
    assert convocatorias
    for c in convocatorias:
        assert is_valid(c), c
        assert c["id"].startswith("dog:")
        assert c["ccaa"] == "GA"
        assert c["ambito"] == "autonomico"
        assert c["fuente"]["codigo"] == "dog"
        assert c["fecha_publicacion"] == "2026-07-24"
        assert c["url_oficial"].startswith("https://www.xunta.gal/")


def test_dia_sin_oposiciones_devuelve_vacio():
    assert DogScraper().parse("") == []


def test_fragmento_incorrecto_falla():
    with pytest.raises(ValueError):
        DogScraper().parse("<div>Outra sección calquera</div>")
