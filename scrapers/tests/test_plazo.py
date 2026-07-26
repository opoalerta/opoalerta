"""Tests del extractor de plazos (offline, sin red)."""

from datetime import date

from common.plazo import calcular_fin, extraer_plazo


def test_naturales_en_palabras():
    txt = (
        "Las personas interesadas dirigirán sus solicitudes dentro del plazo de diez "
        "días naturales siguientes al de la publicación de esta resolución en el BOE."
    )
    p = extraer_plazo(txt)
    assert p is not None
    assert p["dias"] == 10
    assert p["tipo"] == "naturales"
    assert "diez días naturales" in p["plazo_texto"]
    assert calcular_fin(date(2026, 7, 24), p) == date(2026, 8, 3)


def test_habiles_no_calcula_fecha():
    txt = (
        "El plazo de presentación de solicitudes será de veinte días hábiles "
        "a partir del día siguiente."
    )
    p = extraer_plazo(txt)
    assert p["dias"] == 20
    assert p["tipo"] == "habiles"
    # Decisión de diseño: en hábiles NO calculamos fecha (evita fechas erróneas).
    assert calcular_fin(date(2026, 7, 24), p) is None


def test_numero_en_digitos():
    txt = (
        "Las solicitudes se presentarán en el plazo de 15 días hábiles "
        "contados desde el día siguiente."
    )
    p = extraer_plazo(txt)
    assert p["dias"] == 15
    assert p["tipo"] == "habiles"


def test_ignora_plazo_de_subsanacion():
    # Solo hay un plazo y es de subsanación (personas excluidas): NO es el de
    # presentación -> no se debe extraer (mejor sin dato que un plazo erróneo).
    txt = "Se requiere a las personas excluidas para que subsanen en el plazo de tres días hábiles."
    assert extraer_plazo(txt) is None


def test_elige_presentacion_entre_varios_plazos():
    txt = (
        "El plazo de presentación de solicitudes será de veinte días naturales desde la "
        "publicación. Las personas excluidas podrán subsanar en el plazo de diez días hábiles."
    )
    p = extraer_plazo(txt)
    assert p is not None
    assert p["dias"] == 20
    assert p["tipo"] == "naturales"
    assert "presentación de solicitudes" in p["plazo_texto"]


def test_sin_plazo_devuelve_none():
    assert extraer_plazo("Resolución por la que se nombra a un funcionario.") is None
    assert extraer_plazo("") is None
