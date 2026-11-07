"""Tests offline del scraper del DOGV (C. Valenciana) — fixture, sin red."""

import json
from pathlib import Path

import pytest

from common.schema import is_valid
from dogv import DogvScraper, _oposiciones

FIXTURE = Path(__file__).parent / "fixtures" / "dogv-20260724.json"
SUBSECCION = "A) OFERTAS DE EMPLEO PÚBLICO, OPOSICIONES Y CONCURSOS"


@pytest.fixture
def raw():
    return json.loads(FIXTURE.read_text(encoding="utf-8"))


def test_cada_disposicion_lleva_la_fecha_de_su_sumario(raw):
    """La ventana mezcla varios días, así que la fecha no puede ser global."""
    convocatorias = DogvScraper().run(raw=raw)
    assert {c["fecha_publicacion"] for c in convocatorias} == {"2026-07-24"}


def test_una_ventana_de_varios_dias_no_duplica(raw):
    """El mismo sumario repetido en la ventana no debe producir duplicados."""
    convocatorias = DogvScraper().run(raw=[raw, raw])
    assert len(convocatorias) == 26


def test_parse_solo_la_subseccion_de_oposiciones(raw):
    registros = DogvScraper().parse(raw)
    assert len(registros) == 26
    assert all(r["subseccion"]["descripcion"] == SUBSECCION for r in registros)


def test_deja_fuera_nombramientos_y_subvenciones(raw):
    """El sumario trae ambas cosas y ninguna es una convocatoria."""
    total = len(raw["disposiciones"])
    registros = DogvScraper().parse(raw)
    assert total > len(registros)
    subsecciones = {r["subseccion"]["descripcion"] for r in registros}
    assert "B) NOMBRAMIENTOS Y CESES" not in subsecciones
    assert "B) SUBVENCIONES Y BECAS" not in subsecciones


def test_run_produce_convocatorias_validas(raw):
    convocatorias = DogvScraper().run(raw=raw)
    assert len(convocatorias) == 26
    for c in convocatorias:
        assert is_valid(c), c
        assert c["id"].startswith("dogv:2026-")
        assert c["ccaa"] == "VC"
        assert c["ambito"] in ("autonomico", "local", "universidad")
        assert c["fuente"]["codigo"] == "dogv"
        assert c["fecha_publicacion"] == "2026-07-24"
        assert c["url_oficial"].startswith("https://dogv.gva.es/datos/2026/07/24/pdf/")


def test_los_identificadores_no_se_repiten(raw):
    ids = [c["id"] for c in DogvScraper().run(raw=raw)]
    assert len(ids) == len(set(ids))


def test_el_id_usa_el_codigo_de_insercion(raw):
    """El código de inserción es estable entre ediciones; el id interno no."""
    convocatorias = DogvScraper().run(raw=raw)
    codigos = {d["codigoInsercion"].replace("/", "-") for d in _oposiciones(raw)}
    assert {c["id"].removeprefix("dogv:") for c in convocatorias} == codigos


@pytest.mark.parametrize(
    ("titulo", "esperado"),
    [
        ("RESOLUCIÓN por la que se convoca concurso-oposición de 20 plazas", "concurso_oposicion"),
        ("Convocatoria de proceso selectivo de administrativo", "oposicion"),
        ("Constitución de bolsa de empleo temporal", "bolsa"),
        ("Convocatoria de concurso de méritos", "concurso"),
        ("Convocatoria de promoción interna", "promocion_interna"),
        ("Anuncio sobre cualquier otra cosa", None),
    ],
)
def test_tipo_acceso(titulo, esperado):
    from dogv import _tipo_acceso

    assert _tipo_acceso(titulo) == esperado


def test_sumario_bis_sin_oposiciones_devuelve_vacio():
    """Las ediciones extraordinarias suelen traer una sola disposición ajena."""
    bis = {
        "fechaSumario": "30-07-2026",
        "esBis": True,
        "disposiciones": [
            {
                "id": 1,
                "titulo": "ORDEN de medidas por incendio forestal",
                "seccion": {"descripcion": "III. ACTOS ADMINISTRATIVOS"},
                "subseccion": {"descripcion": "C) OTROS ASUNTOS"},
                "codigoInsercion": "2026/25908",
                "urlPdf": "/2026/07/30/pdf/2026_25908_es.pdf",
            }
        ],
    }
    assert DogvScraper().parse(bis) == []


def test_vacio_devuelve_vacio():
    assert DogvScraper().parse({}) == []


def test_respuesta_que_no_es_un_sumario_falla():
    with pytest.raises(ValueError):
        DogvScraper().parse({"error": "algo"})


def test_fecha_ilegible_falla_si_hay_convocatorias():
    """Antes de publicar con una fecha inventada, mejor romper."""
    sumario = {
        "fechaSumario": "no es una fecha",
        "disposiciones": [
            {
                "id": 1,
                "titulo": "Convocatoria de proceso selectivo",
                "subseccion": {"descripcion": SUBSECCION},
                "codigoInsercion": "2026/1",
                "urlPdf": "/x.pdf",
            }
        ],
    }
    with pytest.raises(ValueError):
        DogvScraper().parse(sumario)


def test_sumario_vacio_sin_fecha_no_rompe_la_ingesta():
    """Algunos días llegan sin fechaSumario; si no traen nada, se ignoran."""
    assert DogvScraper().parse({"fechaSumario": "", "disposiciones": []}) == []


def test_ambito_en_la_fixture_de_julio(raw):
    # 24/7/2026: 12 del IVIA, Generalitat, tres universidades y un ayuntamiento.
    por_ambito = {}
    for c in DogvScraper().run(raw=raw):
        por_ambito.setdefault(c["ambito"], []).append(c["organismo"])
    assert por_ambito["local"] == ["Ayuntamiento de Xirivella"]
    assert len(por_ambito["universidad"]) == 6
    assert len(por_ambito["autonomico"]) == 19


# Sumario real del 6/11/2026: convocan las Corts, Turisme Comunitat Valenciana,
# dos ayuntamientos y tres universidades (#94).
FIXTURE_ORGANISMOS = Path(__file__).parent / "fixtures" / "dogv-20261106.json"


def test_ambito_sale_del_organismo():
    raw = json.loads(FIXTURE_ORGANISMOS.read_text(encoding="utf-8"))
    por_ambito: dict[str, list[str]] = {}
    for c in DogvScraper().run(raw=raw):
        assert is_valid(c), c
        por_ambito.setdefault(c["ambito"], []).append(c["organismo"])

    assert sorted(por_ambito["local"]) == [
        "Ayuntamiento de Almàssera",
        "Ayuntamiento de Tavernes de la Valldigna",
    ]
    assert len(por_ambito["universidad"]) == 8
    assert sorted(por_ambito["autonomico"]) == ["Corts Valencianes", "Turisme Comunitat Valenciana"]


@pytest.mark.parametrize(
    ("organismo", "esperado"),
    [
        ("Ajuntament de València", "local"),
        ("Diputación Provincial de Alicante", "local"),
        ("Mancomunitat de la Ribera Alta", "local"),
        ("Universitat Politècnica de València", "universidad"),
        ("Consell Jurídic Consultiu de la Comunitat Valenciana", "autonomico"),
        ("Conselleria de Sanidad", "autonomico"),
        ("", "autonomico"),
    ],
)
def test_ambito_por_prefijo(organismo, esperado):
    from dogv import _ambito

    assert _ambito(organismo) == esperado
