"""Tests offline del matching de alertas (función pura, sin red ni base de datos)."""

from notificar import coincide

CONV = {
    "titulo": "Resolución por la que se convoca proceso selectivo de Auxiliar Administrativo",
    "organismo": "Consejería de Educación",
    "ambito": "autonomico",
    "ccaa": "AN",
    "fuente_codigo": "boja",
}


def test_sin_filtros_siempre_coincide():
    assert coincide(CONV, {})


def test_filtro_fuente():
    assert coincide(CONV, {"fuente_codigo": "boja"})
    assert not coincide(CONV, {"fuente_codigo": "boe"})


def test_filtro_ambito_y_ccaa():
    assert coincide(CONV, {"ambito": "autonomico", "ccaa": "AN"})
    assert not coincide(CONV, {"ambito": "estatal"})
    assert not coincide(CONV, {"ccaa": "MD"})


def test_texto_ignora_acentos_y_mayusculas():
    assert coincide(CONV, {"q": "AUXILIAR"})
    assert coincide(CONV, {"q": "administrativo"})
    assert coincide(CONV, {"q": "educacion"})  # sin tilde
    assert not coincide(CONV, {"q": "bombero"})


def test_combinacion_de_filtros():
    assert coincide(CONV, {"fuente_codigo": "boja", "q": "selectivo"})
    assert not coincide(CONV, {"fuente_codigo": "boja", "q": "veterinario"})
