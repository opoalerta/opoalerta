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
    txt = "El plazo de presentación será de veinte días hábiles a partir del día siguiente."
    p = extraer_plazo(txt)
    assert p["dias"] == 20
    assert p["tipo"] == "habiles"
    # Decisión de diseño: en hábiles NO calculamos fecha (evita fechas erróneas).
    assert calcular_fin(date(2026, 7, 24), p) is None


def test_numero_en_digitos():
    txt = "en el plazo de 15 días hábiles contados desde el día siguiente."
    p = extraer_plazo(txt)
    assert p["dias"] == 15
    assert p["tipo"] == "habiles"


def test_sin_plazo_devuelve_none():
    assert extraer_plazo("Resolución por la que se nombra a un funcionario.") is None
    assert extraer_plazo("") is None


def test_palabra_desconocida_guarda_frase_sin_dias():
    txt = "en el plazo de cincuenta días naturales desde la publicación."
    p = extraer_plazo(txt)
    assert p is not None  # detecta el plazo…
    assert p["dias"] is None  # …pero no sabe el número -> sin fecha
    assert calcular_fin(date(2026, 7, 24), p) is None
