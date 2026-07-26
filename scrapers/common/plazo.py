"""Extracción del plazo de presentación de solicitudes desde el texto oficial.

El plazo no está en los sumarios, sino en el cuerpo de cada disposición
("...en el plazo de veinte días hábiles a partir del día siguiente al de la
publicación..."). Este módulo:

  - `extraer_plazo(texto)` -> localiza la frase y devuelve la frase literal, el
    número de días y el tipo (naturales/hábiles). Riesgo cero: la frase se
    guarda tal cual.
  - `calcular_fin(fecha_pub, plazo)` -> calcula la fecha de fin SOLO para plazos
    en días **naturales** (exacto). Para **hábiles** devuelve None a propósito:
    calcularlo sin el calendario de festivos daría fechas erróneas, y una fecha
    de vencimiento equivocada es peor que ninguna. La frase (`plazo_texto`)
    queda disponible igualmente.

Uso típico (pase de enriquecimiento):
    p = extraer_plazo(texto_disposicion)
    if p:
        fin = calcular_fin(fecha_publicacion, p)  # date | None
"""

from __future__ import annotations

import re
from datetime import date, timedelta

# Cardinales que aparecen en plazos de oposiciones (1..40 cubre casi todo).
_PALABRAS: dict[str, int] = {
    "un": 1,
    "uno": 1,
    "una": 1,
    "dos": 2,
    "tres": 3,
    "cuatro": 4,
    "cinco": 5,
    "seis": 6,
    "siete": 7,
    "ocho": 8,
    "nueve": 9,
    "diez": 10,
    "once": 11,
    "doce": 12,
    "trece": 13,
    "catorce": 14,
    "quince": 15,
    "dieciseis": 16,
    "dieciséis": 16,
    "diecisiete": 17,
    "dieciocho": 18,
    "diecinueve": 19,
    "veinte": 20,
    "veintiuno": 21,
    "veintidos": 22,
    "veintidós": 22,
    "veintitres": 23,
    "veintitrés": 23,
    "veinticuatro": 24,
    "veinticinco": 25,
    "veintiseis": 26,
    "veintiséis": 26,
    "veintisiete": 27,
    "veintiocho": 28,
    "veintinueve": 29,
    "treinta": 30,
    "cuarenta": 40,
}

# "plazo ... de N días hábiles|naturales". Tolera texto entre "plazo" y "de".
_PLAZO_RE = re.compile(
    r"plazo[^.]{0,40}?\bde\s+(?P<num>\d{1,3}|[a-záéíóú]+)\s+d[íi]as\s+"
    r"(?P<tipo>h[áa]biles|naturales)",
    re.IGNORECASE,
)


def _a_numero(token: str) -> int | None:
    token = token.strip().lower()
    if token.isdigit():
        return int(token)
    return _PALABRAS.get(token)


def _frase(texto: str, inicio: int) -> str:
    """Devuelve la oración (hasta el punto) que contiene el plazo, normalizada."""
    fin = texto.find(".", inicio)
    fin = fin + 1 if fin != -1 else min(len(texto), inicio + 300)
    # Retrocede hasta el principio de la oración para dar contexto.
    ini = texto.rfind(".", 0, inicio)
    ini = ini + 1 if ini != -1 else max(0, inicio - 200)
    return re.sub(r"\s+", " ", texto[ini:fin]).strip()


def extraer_plazo(texto: str) -> dict | None:
    """Localiza el plazo en el texto. Devuelve dict o None si no lo encuentra.

    dict: {"plazo_texto": str, "dias": int | None, "tipo": "naturales"|"habiles"}
    """
    if not texto:
        return None
    m = _PLAZO_RE.search(texto)
    if not m:
        return None
    tipo = "habiles" if "bil" in m.group("tipo").lower() else "naturales"
    return {
        "plazo_texto": _frase(texto, m.start()),
        "dias": _a_numero(m.group("num")),
        "tipo": tipo,
    }


def calcular_fin(fecha_pub: date, plazo: dict) -> date | None:
    """Fecha de fin del plazo. Solo para 'naturales' (exacto); 'hábiles' -> None.

    El plazo cuenta desde el día siguiente a la publicación, así que el último
    día es `fecha_pub + N` (día 1 = fecha_pub + 1, ..., día N = fecha_pub + N).
    """
    dias = plazo.get("dias")
    if dias is None or plazo.get("tipo") != "naturales":
        return None
    return fecha_pub + timedelta(days=dias)
