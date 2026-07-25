"""Tests offline del scraper del BOCYL (usa una fixture, sin acceso a la red)."""

from pathlib import Path

import pytest

from bocyl import BocylScraper
from common.schema import is_valid

FIXTURE = Path(__file__).parent / "fixtures" / "bocyl-boletin.html"


@pytest.fixture
def raw():
    return FIXTURE.read_text(encoding="utf-8")


def test_solo_seccion_oposiciones(raw):
    registros = BocylScraper().parse(raw)
    # 2 de la Comunidad + 1 local = 3; NO debe incluir B.1 ni C.2 subvenciones.
    assert len(registros) == 3
    ids = {r["id_bocyl"] for r in registros}
    assert "BOCYL-D-24072026-142-1" not in ids  # B.1 Nombramientos
    assert "BOCYL-D-24072026-142-20" not in ids  # C.2 Subvenciones


def test_ambito_autonomico_y_local(raw):
    registros = BocylScraper().parse(raw)
    ambitos = {r["id_bocyl"]: r["ambito"] for r in registros}
    assert ambitos["BOCYL-D-24072026-142-4"] == "autonomico"
    assert ambitos["BOCYL-D-24072026-142-25"] == "local"


def test_run_produce_convocatorias_validas(raw):
    convocatorias = BocylScraper().run(raw=raw)
    assert len(convocatorias) == 3
    for c in convocatorias:
        assert is_valid(c), c
        assert c["id"].startswith("bocyl:BOCYL-D-")
        assert c["ccaa"] == "CL"
        assert c["fuente"]["codigo"] == "bocyl"
        assert c["fecha_publicacion"] == "2026-07-24"
        assert c["url_oficial"].startswith("https://bocyl.jcyl.es/")


def test_pagina_no_boletin_falla():
    with pytest.raises(ValueError):
        BocylScraper().parse("<html><body>página de error</body></html>")
