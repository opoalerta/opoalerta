"""Tests offline del scraper del DOCM (Castilla-La Mancha) — fixture, sin red."""

from datetime import date
from pathlib import Path

import pytest

from common.schema import is_valid
from docm import DocmScraper

FIXTURE = Path(__file__).parent / "fixtures" / "docm-sumario.html"


@pytest.fixture
def raw():
    return FIXTURE.read_text(encoding="utf-8")


def test_parse_seccion_oposiciones(raw):
    registros = DocmScraper(fecha=date(2026, 7, 24)).parse(raw)
    assert len(registros) >= 1
    assert all(r["organismo"] for r in registros)
    assert all(r["doc"].startswith("2026_") for r in registros)


def test_run_produce_convocatorias_validas(raw):
    convocatorias = DocmScraper(fecha=date(2026, 7, 24)).run(raw=raw)
    assert convocatorias
    for c in convocatorias:
        assert is_valid(c), c
        assert c["id"].startswith("docm:2026-")
        assert c["ccaa"] == "CM"
        assert c["ambito"] == "autonomico"
        assert c["fuente"]["codigo"] == "docm"
        assert c["fecha_publicacion"] == "2026-07-24"
        assert c["url_oficial"].startswith("https://docm.jccm.es/docm/verArchivoHtml.do")
        assert "[NID" not in c["titulo"]


def test_dia_sin_oposiciones_devuelve_vacio():
    sumario = "<h3>II.- AUTORIDADES Y PERSONAL</h3><h3>III.- OTRAS DISPOSICIONES</h3>"
    assert DocmScraper().parse(sumario) == []


def test_vacio_devuelve_vacio():
    assert DocmScraper().parse("") == []


def test_fragmento_incorrecto_falla():
    with pytest.raises(ValueError):
        DocmScraper().parse("<div>Otra cosa cualquiera</div>")
