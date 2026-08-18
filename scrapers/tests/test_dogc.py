"""Tests offline del scraper del DOGC (usa una fixture, sin acceso a la red).

La fixture es el sumario real del DOGC 9729 (13 de agosto de 2026) más algunas
disposiciones de los boletines de esa misma semana, recortado a 20 documentos
que cubren los casos que los filtros tienen que distinguir:

- Disposiciones generales, Otras disposiciones y Anuncios → fuera enteras.
- Cargos y personal, convocatoria y trámites vivos → entran, ámbito autonómico.
- Cargos y personal, encargo del despacho, cese y designación de vocales → fuera.
- Cargos y personal, epígrafe «Universidades catalanas» → entra con ámbito
  `universidad`; el nombramiento de un catedrático, fuera, y también el de unos
  funcionarios de carrera cuyo título arrastra «pruebas selectivas».
- Administración local, bases de una plaza, bolsa de trabajo y oferta pública de
  empleo → entran, ámbito local.
- Administración local, bases de subvenciones, modificación de la RPT y un
  proyecto de obras → fuera. Las subvenciones son la trampa: usan «bases y la
  convocatoria» igual que una plaza.
- Otros sujetos emisores, bases de selección de un consorcio → entra con ámbito
  `otro`; la disolución de una cooperativa, fuera.

Recortada a lo ancho a propósito: si sólo llevara los que entran, un filtro roto
que dejara pasar el sumario entero daría el mismo resultado (#93 del BOA).
"""

import json
import re
from pathlib import Path

import pytest

import dogc
from common.schema import is_valid
from dogc import DogcScraper

FIXTURE = Path(__file__).parent / "fixtures" / "dogc-9729.json"

#: Documentos que trae la fixture.
TOTAL_DOCUMENTOS = 20
#: Los que quedan tras descartar las tres secciones que no son de empleo. Es lo
#: que devolvería el scraper si los filtros por título no descartaran nada.
SIN_FILTRO_DE_TITULO = 17
#: Los que tienen que sobrevivir a todo.
TOTAL_CONVOCATORIAS = 8


@pytest.fixture
def raw():
    return json.loads(FIXTURE.read_text(encoding="utf-8"))


@pytest.fixture
def registros(raw):
    return DogcScraper().parse(raw)


def test_recoge_las_tres_secciones_con_empleo(registros):
    assert len(registros) == TOTAL_CONVOCATORIAS
    ambitos = [r["ambito"] for r in registros]
    assert ambitos.count("autonomico") == 3
    assert ambitos.count("universidad") == 1
    assert ambitos.count("local") == 3
    assert ambitos.count("otro") == 1
    assert all(r["organismo"] for r in registros)


def test_descarta_las_secciones_sin_empleo(registros):
    titulos = " ".join(r["titulo"] for r in registros)
    assert "Comisión Territorial de Urbanismo" not in titulos  # Disposiciones generales
    assert "Fondo de Cooperación Local" not in titulos  # Otras disposiciones
    assert "autorización ambiental" not in titulos  # Anuncios


def test_descarta_nombramientos_ceses_y_altos_cargos(registros):
    titulos = " ".join(r["titulo"] for r in registros)
    assert "encargo del despacho" not in titulos
    assert "de cese del señor" not in titulos
    assert "se designan los vocales" not in titulos
    assert "se nombra catedrático" not in titulos


def test_descarta_el_nombramiento_que_arrastra_el_nombre_del_proceso(registros):
    """«Se hace público el nombramiento […] de las personas aspirantes aprobadas
    en las pruebas selectivas» es el final del proceso, no una convocatoria.

    Es el caso que se coló en la primera ejecución real: las señales de
    convocatoria que rescatan la libre designación también lo rescataban a él.
    """
    assert not [r for r in registros if "pruebas selectivas" in r["titulo"]]


def test_la_libre_designacion_sobrevive_al_descarte(registros):
    """«Designación» está en el descarte, pero una convocatoria manda sobre él.

    «Se resuelve la convocatoria para la provisión, por el sistema de libre
    designación, de dos puestos» es una plaza, no el nombramiento de un cargo.
    """
    designacion = [r for r in registros if "libre designación" in r["titulo"]]
    assert len(designacion) == 1
    assert designacion[0]["ambito"] == "autonomico"


def test_el_organismo_local_es_el_ente_no_el_epigrafe(registros):
    locales = [r for r in registros if r["ambito"] == "local"]
    assert {r["organismo"] for r in locales} == {
        "Ayuntamiento de Manlleu",
        "Ayuntamiento de Forallac",
        "Consejo Comarcal de La Selva",
    }


def test_descarta_las_subvenciones_de_la_local(registros):
    """La trampa de la sección local: subvenciones con «bases y la convocatoria»."""
    titulos = " ".join(r["titulo"] for r in registros)
    assert "concesión de ayudas" not in titulos
    assert "relación de puestos de trabajo" not in titulos  # RPT: organigrama, no plaza
    assert "Proyecto básico y ejecutivo" not in titulos


def test_el_filtro_hace_algo(raw):
    """Sin los filtros por título tienen que salir bastantes más registros.

    Los tres que faltan para los 20 de la fixture son los de las secciones que se
    descartan enteras, que no dependen de estas expresiones.
    """
    con_filtro = len(DogcScraper().parse(raw))
    originales = (dogc._EMPLEO_RE, dogc._NO_EMPLEO_RE, dogc._CERRADO_RE, dogc._DUDOSO_RE)
    # Filtro nulo: una expresión vacía casa con cualquier título, así que
    # `_EMPLEO_RE` deja pasar todo, y `(?!x)x` no casa con ninguno, así que las
    # tres de descarte no descartan nada.
    dogc._EMPLEO_RE = re.compile("")
    dogc._NO_EMPLEO_RE = re.compile(r"(?!x)x")
    dogc._CERRADO_RE = re.compile(r"(?!x)x")
    dogc._DUDOSO_RE = re.compile(r"(?!x)x")
    try:
        sin_filtro = len(DogcScraper().parse(raw))
    finally:
        dogc._EMPLEO_RE, dogc._NO_EMPLEO_RE, dogc._CERRADO_RE, dogc._DUDOSO_RE = originales
    assert con_filtro == TOTAL_CONVOCATORIAS
    assert sin_filtro == SIN_FILTRO_DE_TITULO
    assert SIN_FILTRO_DE_TITULO < TOTAL_DOCUMENTOS


def test_la_fecha_sale_del_sumario_no_del_dia_de_ejecucion(registros):
    assert {r["fecha"] for r in registros} == {"2026-08-13"}


def test_run_produce_convocatorias_validas(raw):
    convocatorias = DogcScraper().run(raw=raw)
    assert len(convocatorias) == TOTAL_CONVOCATORIAS
    for c in convocatorias:
        assert is_valid(c), c
        assert re.fullmatch(r"dogc:\d+", c["id"])
        assert c["ccaa"] == "CT"
        assert c["fuente"]["codigo"] == "dogc"
        assert c["fecha_publicacion"] == "2026-08-13"
        assert c["url_oficial"].startswith("https://dogc.gencat.cat/es/document-del-dogc/")


def test_deduplica_entre_sumarios_de_la_ventana(raw):
    """La ventana de días puede repetir un boletín: el id lo descarta."""
    assert len(DogcScraper().parse([raw, raw])) == TOTAL_CONVOCATORIAS


def test_respuesta_que_no_es_sumario_falla():
    with pytest.raises(ValueError):
        DogcScraper().parse({"error": "vaya"})


def test_secciones_desconocidas_fallan(raw):
    """Si el DOGC renombra las secciones, tiene que romper, no devolver cero.

    Devolver una lista vacía es indistinguible de «hoy no había oposiciones», así
    que el fallo se quedaría callado durante semanas.
    """
    renombrado = json.loads(json.dumps(raw))
    for seccion in renombrado["sumaris"][0]["section"]:
        seccion["title"] = "Càrrecs i personal"  # el DOGC vuelve al catalán
    with pytest.raises(ValueError):
        DogcScraper().parse(renombrado)
