"""Tests offline del scraper del DOCM (Castilla-La Mancha) — fixture, sin red."""

from datetime import date
from pathlib import Path

import pytest

from common.schema import is_valid
from docm import _RUTA_RE, DocmScraper

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


def test_la_fecha_sale_de_las_rutas_de_los_pdf():
    """
    Regresión de #72.

    La portada enlazaba las fechas como `cambiarBoletin.do?fecha=YYYYMMDD` y el
    1 de agosto de 2026 esos enlaces desaparecieron, dejando la ingesta caída.
    Las rutas de los PDF llevan la misma fecha y siguen ahí.
    """
    portada = (
        '<a href="./descargarArchivo.do?ruta=2026/07/30/pdf/2026_5000.pdf&tipo=rutaDocm">a</a>'
        '<a href="./descargarArchivo.do?ruta=2026/07/31/pdf/2026_5075.pdf&tipo=rutaDocm">b</a>'
    )
    fechas = {f"{a}{m}{d}" for a, m, d, _ in _RUTA_RE.findall(portada)}
    assert max(fechas) == "20260731"


def test_portada_sin_rutas_falla():
    """Sin fecha no se puede pedir el sumario; mejor romper que adivinar."""
    assert not _RUTA_RE.findall("<html>portal sin boletines</html>")
