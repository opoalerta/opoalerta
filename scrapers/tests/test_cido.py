"""Tests offline del scraper del CIDO (usa una fixture, sin acceso a la red).

La fixture son dos páginas reales de la API (`filter[idEstat]=1,2,3` +
`include=documents`) recortadas a 13 fichas que cubren lo que el mapeo tiene que
distinguir:

- Un ámbito de cada familia: autonómico no, porque el interesante es el resto —
  municipios (Barcelona, Girona, Lleida, Tarragona), consejo comarcal,
  diputación, cuerpos del Estado y «altres entitats».
- «Universitat Oberta de Catalunya» y «Universitat Politècnica» → `universidad`;
  «Fundació Hospital Universitari Vall d'Hebron» → **no**, que es la trampa: el
  adjetivo «universitari» nombra hospitales e institutos de investigación.
- Los cuatro sistemas de selección vistos en producción (mèrits, concurs
  oposició, oposició y lliure designació) más una bolsa de trabajo, que manda
  sobre el sistema.
- Grupos: «A1 - …» → A1, «Agrupacions professionals» → AP y «A - Grau
  universitari» → null, porque no distingue A1 de A2.
- `numPlaces` a 0 (bolsas) → null.
- Una ficha sin ninguna publicación oficial (sólo web municipal): ni documentos,
  ni `maxDataPublicacioDocument`, ni `dataInici`. Es el caso que justifica la
  segunda consulta por `-id` del scraper.
- Una ficha repetida en las dos páginas, para el deduplicado.
"""

import json
import re
from datetime import date
from pathlib import Path

import pytest

from cido import CidoScraper
from common.schema import is_valid

FIXTURE = Path(__file__).parent / "fixtures" / "cido.json"

#: Fichas de la fixture contando la repetida.
TOTAL_FICHAS = 14
#: Las que quedan tras deduplicar por id.
TOTAL_CONVOCATORIAS = 13
#: Fecha de ejecución fija: la usa el último recurso de `fecha_publicacion`.
HOY = date(2026, 8, 19)


@pytest.fixture
def raw():
    return json.loads(FIXTURE.read_text(encoding="utf-8"))


@pytest.fixture
def scraper():
    return CidoScraper(fecha=HOY)


@pytest.fixture
def convocatorias(scraper, raw):
    return scraper.run(raw=raw)


def _por_id(convocatorias, identificador):
    return next(c for c in convocatorias if c["id"] == f"cido:{identificador}")


def test_run_produce_convocatorias_validas(convocatorias):
    assert len(convocatorias) == TOTAL_CONVOCATORIAS
    for c in convocatorias:
        assert is_valid(c), c
        assert re.fullmatch(r"cido:\d+", c["id"])
        assert c["fuente"]["codigo"] == "cido"
        assert c["url_oficial"].startswith("https://cido.diba.cat/oposicions/")


def test_deduplica_las_fichas_repetidas_entre_las_dos_consultas(scraper, raw):
    """Las dos consultas (por fecha y por id) se solapan casi siempre."""
    fichas = sum(len(pagina["data"]) for pagina in raw)
    assert fichas == TOTAL_FICHAS
    assert len(scraper.parse(raw)) == TOTAL_CONVOCATORIAS


def test_los_ambitos_salen_del_idambit(convocatorias):
    assert _por_id(convocatorias, "22086012")["ambito"] == "local"  # municipio
    assert _por_id(convocatorias, "22082735")["ambito"] == "local"  # consejo comarcal
    assert _por_id(convocatorias, "22085177")["ambito"] == "provincial"  # diputación
    assert _por_id(convocatorias, "22088276")["ambito"] == "otro"  # consorcio
    assert _por_id(convocatorias, "22071800")["ambito"] == "estatal"  # cuerpos del Estado


def test_solo_las_universidades_de_verdad_son_universidad(convocatorias):
    assert _por_id(convocatorias, "22083069")["ambito"] == "universidad"  # UOC
    assert _por_id(convocatorias, "22077478")["ambito"] == "universidad"  # UPC
    hospital = _por_id(convocatorias, "22088151")  # Hospital Universitari Vall d'Hebron
    assert "Universitari" in hospital["organismo"]
    assert hospital["ambito"] == "otro"


def test_la_ccaa_es_catalunya_salvo_en_lo_estatal(convocatorias):
    catalanas = [c for c in convocatorias if c["ambito"] != "estatal"]
    assert {c["ccaa"] for c in catalanas} == {"CT"}
    assert _por_id(convocatorias, "22071800")["ccaa"] is None


def test_el_sistema_de_seleccion_se_traduce_a_tipo_acceso(convocatorias):
    assert _por_id(convocatorias, "22077197")["tipo_acceso"] == "oposicion"
    assert _por_id(convocatorias, "22083022")["tipo_acceso"] == "concurso_oposicion"
    assert _por_id(convocatorias, "22083069")["tipo_acceso"] == "concurso"
    assert _por_id(convocatorias, "22082580")["tipo_acceso"] == "otro"  # lliure designació


def test_la_bolsa_de_trabajo_manda_sobre_el_sistema(convocatorias):
    """`borsaTreball` es lo que distingue una bolsa de una plaza en propiedad."""
    assert _por_id(convocatorias, "22084962")["tipo_acceso"] == "bolsa"


def test_el_grupo_sale_del_prefijo_del_texto(convocatorias):
    assert _por_id(convocatorias, "22083069")["grupo"] == "A1"
    assert _por_id(convocatorias, "22082735")["grupo"] == "C2"
    assert _por_id(convocatorias, "22086012")["grupo"] == "AP"


def test_el_grupo_a_sin_subgrupo_no_se_inventa(convocatorias):
    """«A - Grau universitari» no dice si es A1 o A2: mejor null que adivinar."""
    assert _por_id(convocatorias, "22088151")["grupo"] is None


def test_cero_plazas_significa_que_no_consta(convocatorias):
    assert _por_id(convocatorias, "22084962")["num_plazas"] is None
    assert _por_id(convocatorias, "22083022")["num_plazas"] == 40


def test_la_fecha_de_publicacion_sale_del_documento_oficial(convocatorias):
    """No de `maxDataPublicacioDocument`, que no viaja en todas las respuestas."""
    assert _por_id(convocatorias, "22083069")["fecha_publicacion"] == "2026-08-05"
    assert all(c["fecha_publicacion"] <= HOY.isoformat() for c in convocatorias)


def test_la_convocatoria_sin_boletin_cae_en_el_dia_de_ingesta(convocatorias):
    """Sólo está en la web del ayuntamiento: no hay fecha oficial que copiar.

    El esquema exige `fecha_publicacion`, así que el último recurso es el día de
    la ejecución; el plazo sí es real y viene de `dataFinalitzacio`.
    """
    sin_boletin = _por_id(convocatorias, "22025969")
    assert sin_boletin["fecha_publicacion"] == HOY.isoformat()
    assert sin_boletin["fecha_fin_plazo"] == "2027-07-30"


def test_el_fin_de_plazo_sale_de_datafinalitzacio(convocatorias):
    assert _por_id(convocatorias, "22083069")["fecha_fin_plazo"] == "2026-09-04"
    assert _por_id(convocatorias, "22085177")["fecha_fin_plazo"] is None


def test_una_respuesta_vacia_falla(scraper):
    """Cero convocatorias en un catálogo de 8.500 es la API rota, no un día sin nada."""
    with pytest.raises(ValueError):
        scraper.parse([{"data": [], "meta": {"totalResourceCount": 0}}])


def test_una_ficha_sin_titulo_se_descarta(scraper, raw):
    mutilada = json.loads(json.dumps(raw))
    mutilada[0]["data"][0]["attributes"]["titol"] = None
    assert len(scraper.parse(mutilada)) == TOTAL_CONVOCATORIAS - 1
