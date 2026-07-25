"""Tests offline del scraper del BOA (Aragón) — usa una fixture, sin red."""

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


def test_parse_items_con_organismo(raw):
    registros = BoaScraper(fecha=date(2026, 7, 24)).parse(raw)
    assert len(registros) == 3
    # El segundo emisor se hereda para sus dos títulos.
    assert registros[1]["organismo"].startswith("DEPARTAMENTO DE HACIENDA")
    assert registros[2]["organismo"].startswith("DEPARTAMENTO DE HACIENDA")


def test_run_produce_convocatorias_validas(raw):
    convocatorias = BoaScraper(fecha=date(2026, 7, 24)).run(raw=raw)
    assert len(convocatorias) == 3
    for c in convocatorias:
        assert is_valid(c), c
        assert re.fullmatch(r"boa:20260724-\d+", c["id"])
        assert c["ccaa"] == "AR"
        assert c["ambito"] == "autonomico"
        assert c["fuente"]["codigo"] == "boa"
        assert c["fecha_publicacion"] == "2026-07-24"
        assert c["url_oficial"].startswith("https://www.boa.aragon.es/")


def test_dia_sin_boletin_devuelve_vacio():
    # Página de inicio del BOA (sin "Lista de documentos") → 0, sin error.
    assert BoaScraper().parse("<html><body>Buscar en BOA</body></html>") == []


def test_lista_sin_items_falla():
    # Hay lista pero no se parsea nada → probable cambio de formato.
    with pytest.raises(ValueError):
        BoaScraper().parse("<html><body>Lista de documentos (1-5/5) sin estructura</body></html>")
