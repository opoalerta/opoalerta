"""Tests offline del scraper del BOPA (Asturias) — fixture, sin red."""

from pathlib import Path

import pytest

from bopa import BopaScraper
from common.schema import is_valid

FIXTURE = Path(__file__).parent / "fixtures" / "bopa-20260715.html"


@pytest.fixture
def raw():
    return FIXTURE.read_text(encoding="utf-8")


def test_la_fecha_sale_del_pdf_del_boletin(raw):
    """El sumario no lleva la fecha en texto; se deduce del enlace al boletín."""
    s = BopaScraper()
    s.parse(raw)
    assert s.fecha.isoformat() == "2026-07-15"


def test_parse_solo_la_seccion_de_personal(raw):
    registros = BopaScraper().parse(raw)
    assert registros
    assert all(r["codigo"].startswith("2026-") for r in registros)
    assert all(r["titulo"] for r in registros)

    # Nada de OTRAS DISPOSICIONES, ANUNCIOS ni AYUNTAMIENTOS: la fixture trae
    # esas secciones y ninguna de sus disposiciones debe colarse.
    titulos = " ".join(r["titulo"].lower() for r in registros)
    assert "instalación eléctrica" not in titulos
    assert "padrón" not in titulos


def test_descarta_los_actos_que_no_convocan_nada(raw):
    """La sección de personal mezcla convocatorias con actos administrativos."""
    registros = BopaScraper().parse(raw)
    titulos = [r["titulo"].lower() for r in registros]
    assert not any("sustituida por" in t for t in titulos)
    assert not any("delegación de competencias" in t for t in titulos)


def test_run_produce_convocatorias_validas(raw):
    convocatorias = BopaScraper().run(raw=raw)
    assert convocatorias
    for c in convocatorias:
        assert is_valid(c), c
        assert c["id"].startswith("bopa:2026-")
        assert c["ccaa"] == "AS"
        assert c["ambito"] == "autonomico"
        assert c["fuente"]["codigo"] == "bopa"
        assert c["fecha_publicacion"] == "2026-07-15"
        assert c["url_oficial"].startswith("https://sede.asturias.es/bopa/2026/07/15/")
        assert c["url_oficial"].endswith(".pdf")


def test_los_identificadores_no_se_repiten(raw):
    ids = [c["id"] for c in BopaScraper().run(raw=raw)]
    assert len(ids) == len(set(ids))


@pytest.mark.parametrize(
    ("titulo", "esperado"),
    [
        (
            "Resolución por la que se convoca concurso-oposición para 10 plazas",
            "concurso_oposicion",
        ),
        ("Convocatoria de proceso selectivo de auxiliar administrativo", "oposicion"),
        ("Resolución de constitución de bolsa de empleo de celador", "bolsa"),
        ("Convocatoria para la provisión de puesto por libre designación", "concurso"),
        ("Convocatoria de promoción interna para técnicos", "promocion_interna"),
    ],
)
def test_tipo_acceso(titulo, esperado):
    from bopa import _tipo_acceso

    assert _tipo_acceso(titulo) == esperado


def test_dia_sin_convocatorias_devuelve_vacio():
    sumario = (
        '<div id="bopa-boletin"><h5>AUTORIDADES Y PERSONAL</h5>'
        "<h6>PRESIDENCIA</h6><dl><dt>Decreto por el que se dispone una sustitución "
        "temporal. <strong>[Cód. 2026-00001]</strong></dt></dl></div>"
    )
    raw = '<a href="/bopa/2026/07/15/20260715.pdf">boletín</a>' + sumario
    assert BopaScraper().parse(raw) == []


def test_vacio_devuelve_vacio():
    assert BopaScraper().parse("") == []


def test_fragmento_incorrecto_falla():
    with pytest.raises(ValueError):
        BopaScraper().parse("<div>Cualquier otra cosa</div>")


def test_sumario_sin_enlace_al_boletin_falla():
    """Sin ese enlace no hay fecha, y publicar con una fecha inventada es peor."""
    with pytest.raises(ValueError):
        BopaScraper().parse('<div id="bopa-boletin"><h5>AUTORIDADES Y PERSONAL</h5></div>')


def test_dia_sin_boletin_no_aporta_nada(raw):
    """Pedir un día sin BOPA devuelve el último boletín; no debe contarse dos veces."""
    from datetime import date

    assert BopaScraper(date(2026, 7, 15)).parse(raw)
    assert BopaScraper(date(2026, 7, 18)).parse(raw) == []


def test_url_por_fecha():
    from datetime import date

    from bopa import SUMARIO_URL, sumario_url

    assert sumario_url(None) == SUMARIO_URL
    assert sumario_url(date(2026, 9, 22)).endswith("?p_r_p_summaryDate=22/09/2026")


def test_dias_habiles_salta_el_fin_de_semana():
    from datetime import date

    from bopa import dias_habiles

    dias = dias_habiles(date(2026, 10, 23), date(2026, 10, 27))  # vie → mar
    assert [d.isoformat() for d in dias] == ["2026-10-23", "2026-10-26", "2026-10-27"]
