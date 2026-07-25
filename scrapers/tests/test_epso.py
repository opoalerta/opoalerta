"""Tests offline del scraper de EPSO (oposiciones de la UE) — fixture, sin red."""

import re
from pathlib import Path

import pytest

from common.schema import is_valid
from epso import EpsoScraper

FIXTURE = Path(__file__).parent / "fixtures" / "epso-lista.html"


@pytest.fixture
def raw():
    return FIXTURE.read_text(encoding="utf-8")


def test_parse_extrae_filas(raw):
    registros = EpsoScraper().parse(raw)
    assert len(registros) == 3
    assert all(r["titulo"] for r in registros)
    assert all(r["url"].startswith("https://eu-careers.europa.eu/") for r in registros)


def test_run_produce_convocatorias_validas(raw):
    convocatorias = EpsoScraper().run(raw=raw)
    assert convocatorias
    for c in convocatorias:
        assert is_valid(c), c
        assert c["id"].startswith("epso:")
        assert c["ambito"] == "europeo"
        assert c["ccaa"] is None
        assert c["fuente"]["codigo"] == "epso"
        assert c["organismo"] == "Unión Europea (EPSO)"


def test_titulo_marca_la_referencia(raw):
    convocatorias = EpsoScraper().run(raw=raw)
    # Al menos una debe mostrar la referencia EPSO en el título.
    assert any(re.search(r"\(EPSO/[^)]+\)", c["titulo"]) for c in convocatorias)


def test_lista_sin_filas_falla():
    with pytest.raises(ValueError):
        EpsoScraper().parse('<table><tr class="job-row"><td>roto</td></tr></table>')
