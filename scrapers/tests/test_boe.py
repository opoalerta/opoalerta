"""Tests offline del scraper del BOE (usa una fixture, sin acceso a la red)."""

import json
from datetime import date
from pathlib import Path

import pytest

from boe import BoeScraper
from common.schema import is_valid

FIXTURE = Path(__file__).parent / "fixtures" / "boe-20250723.json"


@pytest.fixture
def raw():
    return json.loads(FIXTURE.read_text(encoding="utf-8"))


def test_parse_extrae_items(raw):
    scraper = BoeScraper(fecha=date(2025, 7, 23))
    registros = scraper.parse(raw)
    assert len(registros) >= 1
    assert all(r["identificador"] for r in registros)
    assert all(r["organismo"] for r in registros)


def test_run_produce_convocatorias_validas(raw):
    scraper = BoeScraper(fecha=date(2025, 7, 23))
    convocatorias = scraper.run(raw=raw)
    assert convocatorias
    for c in convocatorias:
        assert is_valid(c), c
        assert c["id"].startswith("boe:BOE-A-")
        assert c["ambito"] == "estatal"
        assert c["ccaa"] is None
        assert c["fuente"]["codigo"] == "boe"
        assert c["fecha_publicacion"] == "2025-07-23"
        assert c["url_oficial"].startswith("https://www.boe.es/")


def test_as_list_maneja_dict_y_lista():
    from boe import _as_list

    assert _as_list(None) == []
    assert _as_list({"a": 1}) == [{"a": 1}]
    assert _as_list([1, 2]) == [1, 2]


def test_seccion_distinta_no_devuelve_nada(raw):
    # Cambia el código de sección: el scraper no debe recoger nada.
    raw["data"]["sumario"]["diario"][0]["seccion"][0]["codigo"] = "1"
    scraper = BoeScraper(fecha=date(2025, 7, 23))
    assert scraper.parse(raw) == []
