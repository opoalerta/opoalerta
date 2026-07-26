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
    # Naturales: exacto, no aproximado.
    assert calcular_fin(date(2026, 7, 24), p) == (date(2026, 8, 3), False)


def test_habiles_cuenta_findes_y_festivos():
    txt = (
        "El plazo de presentación de solicitudes será de cinco días hábiles "
        "a partir del día siguiente."
    )
    p = extraer_plazo(txt)
    assert p["dias"] == 5
    assert p["tipo"] == "habiles"
    # Publicación lunes 5-ene-2026. Cuenta desde el día siguiente saltando el
    # martes 6 (Reyes, festivo) y el fin de semana 10-11 -> martes 13-ene.
    fecha, aprox = calcular_fin(date(2026, 1, 5), p)
    assert fecha == date(2026, 1, 13)
    assert aprox is True  # sin festivos autonómicos, es aproximada


def test_habiles_abarca_al_menos_n_dias_naturales():
    txt = "Las solicitudes se presentarán en el plazo de veinte días hábiles."
    p = extraer_plazo(txt)
    fecha, aprox = calcular_fin(date(2026, 7, 24), p)
    assert aprox is True
    assert (fecha - date(2026, 7, 24)).days >= 20


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
