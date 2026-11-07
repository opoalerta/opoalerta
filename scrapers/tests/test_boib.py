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


# Sección II real del BOIB núm. 141 (5/11/2026). Trae la subsección primera
# (nombramientos, que se descarta) y en «Oposiciones y concursos» convocan la
# Comunidad Autónoma, ayuntamientos, consejos insulares y la UIB (#94).
FIXTURE_ORGANISMOS = Path(__file__).parent / "fixtures" / "boib-seccion-20261105.html"


@pytest.fixture
def raw_organismos():
    return FIXTURE_ORGANISMOS.read_text(encoding="utf-8")


def test_ambito_sale_de_la_cabecera_del_organismo(raw_organismos):
    convocatorias = BoibScraper(fecha=date(2026, 11, 5)).run(raw=raw_organismos)
    por_ambito: dict[str, list[str]] = {}
    for c in convocatorias:
        assert is_valid(c), c
        assert c["ccaa"] == "IB"
        por_ambito.setdefault(c["ambito"], []).append(c["organismo"])

    assert len(por_ambito["local"]) == 11
    assert all(o.startswith(("AYUNTAMIENTO ", "CONSEJO INSULAR ")) for o in por_ambito["local"])
    assert any(o.startswith("CONSEJO INSULAR ") for o in por_ambito["local"])
    assert len(por_ambito["universidad"]) == 2
    assert all(o.startswith("UNIVERSIDAD ") for o in por_ambito["universidad"])
    assert len(por_ambito["autonomico"]) == 9
    assert all(
        o.startswith("ADMINISTRACIÓN DE LA COMUNIDAD AUTÓNOMA") for o in por_ambito["autonomico"]
    )


def test_subseccion_de_nombramientos_no_entra(raw_organismos):
    # Lo que va antes de «Oposiciones y concursos» son nombramientos: con la
    # cabecera de la subsección segunda quitada, no se recoge nada.
    sin_oposiciones = raw_organismos.replace("Oposiciones y concursos", "Otra subsección")
    assert BoibScraper(fecha=date(2026, 11, 5)).parse(sin_oposiciones) == []
    assert "Nombramientos" in raw_organismos


def test_ambito_por_prefijo():
    from boib import _ambito

    assert _ambito("AYUNTAMIENTO DE PALMA INSTITUTO MUNICIPAL DEL DEPORTE") == "local"
    assert _ambito("MANCOMUNIDAD DE ES RAIGUER") == "local"
    assert _ambito("SINDICATURA DE CUENTAS") == "autonomico"
    assert _ambito("") == "autonomico"
