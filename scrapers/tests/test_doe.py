"""Tests offline del scraper del DOE (Extremadura) — fixture, sin red."""

from datetime import date
from pathlib import Path

import pytest

from common.schema import is_valid
from doe import DoeScraper

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
