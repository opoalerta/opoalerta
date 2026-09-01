"""Tests de extracción de campos estructurados (offline, sin red)."""

from common.enriquecimiento import extraer_grupo, extraer_num_plazas


def test_extraer_grupo_con_subgrupo():
    assert extraer_grupo("Grupo/Subgrupo A1 de titulación") == "A1"


def test_extraer_grupo_sin_subgrupo():
    assert extraer_grupo("Se convoca proceso selectivo para grupo C1.") == "C1"


def test_extraer_grupo_varias_apariciones():
    # Se queda con la primera.
    assert extraer_grupo("Grupo A2. También grupo B.") == "A2"


def test_extraer_grupo_rechaza_codigo_desconocido():
    assert extraer_grupo("grupo de trabajo conjunto") is None
    assert extraer_grupo("grupo D1") is None


def test_extraer_num_plazas_con_numero_ordinal():
    assert extraer_num_plazas("N.º de plazas: 12") == 12


def test_extraer_num_plazas_con_numero_escrito():
    assert extraer_num_plazas("número de plazas convocadas: 145") == 145


def test_extraer_num_plazas_sin_texto():
    assert extraer_num_plazas("") is None
    assert extraer_num_plazas("No se indican plazas.") is None


def test_extraer_num_plazas_rechaza_cero_o_negativo():
    assert extraer_num_plazas("N.º de plazas: 0") is None


def test_extraer_num_plazas_ignora_grandes_numeros():
    # 2025 podría ser un año, no un número de plazas.
    assert extraer_num_plazas("publicado en 2025. N.º de plazas: 3") == 3


def test_extraer_num_plazas_ordinal_y_sin_punto():
    assert extraer_num_plazas("Nº de plazas: 8") == 8
    assert extraer_num_plazas("Numero de plazas: 21") == 21
    assert extraer_num_plazas("Núm. plazas: 5") == 5


def test_extraer_num_plazas_no_caza_falso_positivo_en():
    # "en plazas" no debe interpretarse como "N.º de plazas".
    assert extraer_num_plazas("Se cubrirán en plazas de trabajo.") is None
