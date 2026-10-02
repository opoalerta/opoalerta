"""Tests offline del scraper del BOPV (País Vasco) — fixture, sin red."""

import re
from datetime import date
from pathlib import Path

import pytest

import bopv
from bopv import BopvScraper, ambito_de, fecha_sumario
from common.schema import is_valid

FIXTURE = Path(__file__).parent / "fixtures" / "bopv-sumario.html"


@pytest.fixture
def raw():
    return FIXTURE.read_text(encoding="utf-8")


def test_fecha_de_la_cabecera(raw):
    # La cabecera lleva dos espacios antes del año («de septiembre de  2026»).
    assert fecha_sumario(raw) == date(2026, 9, 22)


def test_solo_la_seccion_de_oposiciones(raw):
    ids = [r["id_bopv"] for r in BopvScraper().parse(raw)]
    assert ids == ["2603968", "2603969", "2603970", "2603971", "2603972"]
    # El nombramiento de la subsección de al lado queda fuera.
    assert "2603967" not in ids


def test_el_filtro_hace_algo(raw):
    """El filtro deja fuera la mayor parte del boletín, y apuntado a otra
    subsección devuelve otra cosa: no es un filtro que lo deje pasar todo."""
    todas = len(re.findall(r'class="BOPVSumarioTitulo"><a href=', raw))
    con = BopvScraper().parse(raw)
    assert 0 < len(con) < todas
    original = bopv.SECCION_OPOSICIONES
    bopv.SECCION_OPOSICIONES = "Nombramientos, situaciones e incidencias"
    try:
        otra = BopvScraper().parse(raw)
    finally:
        bopv.SECCION_OPOSICIONES = original
    assert [r["id_bopv"] for r in otra] == ["2603967"]


def test_organismo_vacio_hereda_el_anterior(raw):
    registros = BopvScraper().parse(raw)
    osakidetza = [r for r in registros if r["organismo"].startswith("Osakidetza")]
    assert len(osakidetza) == 3


def test_run_produce_convocatorias_validas(raw):
    convocatorias = BopvScraper().run(raw=raw)
    assert len(convocatorias) == 5
    for c in convocatorias:
        assert is_valid(c), c
        assert c["id"].startswith("bopv:")
        assert c["ccaa"] == "PV"
        assert c["fuente"]["codigo"] == "bopv"
        assert c["fecha_publicacion"] == "2026-09-22"
        # La ruta se rehace con la fecha del boletín, no con el enlace relativo.
        assert c["url_oficial"].startswith("https://www.euskadi.eus/bopv2/datos/2026/09/")


@pytest.mark.parametrize(
    ("organismo", "ambito"),
    [
        ("Osakidetza-Servicio Vasco De Salud", "autonomico"),
        ("Ayuntamiento De Getxo", "local"),
        ("Diputación Foral De Bizkaia", "provincial"),
        ("Universidad Del País Vasco", "universidad"),
    ],
)
def test_ambito_segun_quien_convoca(organismo, ambito):
    assert ambito_de(organismo) == ambito


def test_dia_vacio_devuelve_vacio():
    assert BopvScraper().parse("") == []


def test_marcado_desconocido_falla():
    with pytest.raises(ValueError):
        BopvScraper().parse("<html><p>Otra página cualquiera</p></html>")


def test_varios_sumarios_cada_uno_con_su_fecha(raw):
    """fetch() devuelve el último y los anteriores; cada convocatoria lleva la
    fecha de su boletín, no la del último."""
    otro = raw.replace("22 de septiembre de", "21 de septiembre de")
    convocatorias = BopvScraper().run(raw=[raw, otro])
    fechas = sorted({c["fecha_publicacion"] for c in convocatorias})
    assert fechas == ["2026-09-21", "2026-09-22"]
