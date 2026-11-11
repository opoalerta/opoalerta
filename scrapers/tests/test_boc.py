"""Tests offline del scraper del BOC (Canarias) — fixture, sin red."""

from datetime import date
from pathlib import Path
from types import SimpleNamespace

import pytest

import boc
from boc import BocScraper
from common.schema import is_valid

FIXTURE = Path(__file__).parent / "fixtures" / "boc-sumario.html"


@pytest.fixture
def raw():
    return FIXTURE.read_text(encoding="utf-8")


def test_parse_solo_seccion_oposiciones(raw):
    registros = BocScraper(fecha=date(2026, 7, 22)).parse(raw)
    assert len(registros) >= 1
    # El artículo de "Nombramientos" (2600) queda fuera de la sección.
    assert all(r["disp"] != "2600" for r in registros)
    assert all(r["organismo"] for r in registros)


def test_run_produce_convocatorias_validas(raw):
    convocatorias = BocScraper(fecha=date(2026, 7, 22)).run(raw=raw)
    assert convocatorias
    for c in convocatorias:
        assert is_valid(c), c
        assert c["id"].startswith("boc:2026-146-")
        assert c["ccaa"] == "CN"
        assert c["ambito"] == "autonomico"
        assert c["fuente"]["codigo"] == "boc"
        assert c["fecha_publicacion"] == "2026-07-22"
        assert c["url_oficial"].startswith("https://www.gobiernodecanarias.org/boc/2026/146/")


def test_dia_sin_oposiciones_devuelve_vacio():
    sumario = '<h4>II. Autoridades y personal</h4><h3 class="titboc">Otros anuncios</h3>'
    assert BocScraper().parse(sumario) == []


def test_extraordinario_sin_oposiciones_devuelve_vacio():
    # Así es un extraordinario real: una sección, sin `titboc` ni personal.
    sumario = "<h4>I. Disposiciones generales</h4><h5>Presidencia del Gobierno</h5>"
    assert BocScraper().parse(sumario) == []


def test_fetch_salta_el_extraordinario(monkeypatch, raw):
    portada = '<a href="/boc/2026/226">226</a><a href="/boc/2026/225">225</a>'
    paginas = {
        boc.HOME_URL: portada,
        f"{boc.BASE}/boc/2026/226/": "<h4>I. Disposiciones generales</h4> 11 de noviembre de 2026",
        f"{boc.BASE}/boc/2026/225/": raw,
    }
    monkeypatch.setattr(boc, "http_get", lambda url: SimpleNamespace(text=paginas[url]))
    scraper = BocScraper()
    assert scraper.fetch() == raw
    assert scraper.fecha == boc._parse_fecha(raw)


def test_fetch_sin_oposiciones_en_ninguno_usa_el_ultimo(monkeypatch):
    extraordinario = "<h4>I. Disposiciones generales</h4> 11 de noviembre de 2026"
    paginas = {
        boc.HOME_URL: '<a href="/boc/2026/226">226</a><a href="/boc/2026/225">225</a>',
        f"{boc.BASE}/boc/2026/226/": extraordinario,
        f"{boc.BASE}/boc/2026/225/": "<h4>II. Autoridades y personal</h4> 10 de noviembre de 2026",
    }
    monkeypatch.setattr(boc, "http_get", lambda url: SimpleNamespace(text=paginas[url]))
    scraper = BocScraper()
    assert scraper.fetch() == extraordinario
    assert scraper.fecha == date(2026, 11, 11)


def test_vacio_devuelve_vacio():
    assert BocScraper().parse("") == []


def test_fragmento_incorrecto_falla():
    with pytest.raises(ValueError):
        BocScraper().parse("<div>Cualquier otra cosa</div>")
