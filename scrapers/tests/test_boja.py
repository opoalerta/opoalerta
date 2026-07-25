"""Tests offline del scraper del BOJA (usa una fixture, sin acceso a la red)."""

import re
from pathlib import Path

import pytest

from boja import BojaScraper
from common.schema import is_valid

FIXTURE = Path(__file__).parent / "fixtures" / "boja-s53.xml"


@pytest.fixture
def raw():
    return FIXTURE.read_text(encoding="utf-8")


def test_parse_extrae_entradas(raw):
    registros = BojaScraper().parse(raw)
    assert len(registros) >= 1
    assert all(r["titulo"] for r in registros)
    assert all(r["url"].startswith("http") for r in registros)


def test_run_produce_convocatorias_validas(raw):
    convocatorias = BojaScraper().run(raw=raw)
    assert convocatorias
    for c in convocatorias:
        assert is_valid(c), c
        assert c["id"].startswith("boja:")
        assert c["ambito"] == "autonomico"
        assert c["ccaa"] == "AN"
        assert c["fuente"]["codigo"] == "boja"
        assert c["url_oficial"].startswith("http")
        assert re.match(r"\d{4}-\d{2}-\d{2}", c["fecha_publicacion"])


def test_id_derivado_del_enlace(raw):
    convocatorias = BojaScraper().run(raw=raw)
    # Enlaces tipo /boja/2026/142/23.html → boja:2026-142-23
    assert any(re.fullmatch(r"boja:\d{4}-\d+-\d+", c["id"]) for c in convocatorias)


def test_feed_equivocado_falla(raw):
    # Si el feed deja de ser el de oposiciones, debe fallar (→ scraper-roto).
    roto = raw.replace("Oposiciones, concursos y otras convocatorias", "Otra cosa")
    with pytest.raises(ValueError):
        BojaScraper().parse(roto)
