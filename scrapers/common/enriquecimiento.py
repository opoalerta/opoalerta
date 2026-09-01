"""Extracción de campos estructurados del texto oficial de una convocatoria.

Los sumarios suelen omiter el grupo de titulación y el número de plazas, pero el
cuerpo de la disposición los incluye. Este módulo contiene funciones puras
(sin red, sin base de datos) para extraerlos del texto plano ya descargado por
el pase de enriquecimiento.
"""

from __future__ import annotations

import re

# Códigos de grupo normalizados según el CHECK de 001_init.sql.
_GRUPOS_VALIDOS = {"A1", "A2", "B", "C1", "C2", "E", "AP"}

# Grupo/Subgrupo A1, Grupo A2, Subgrupo C1, etc. Se exige un código conocido
# para evitar falsos positivos como "grupo de trabajo".
_GRUPO_RE = re.compile(
    r"(?:grupo/subgrupo|subgrupo|grupo)\s+([ABCE]|A[12]|C[12]|AP)\b",
    re.IGNORECASE,
)

# N.º de plazas: 12, número de plazas: 12, plazas convocadas: 12, etc.
# Se limita a 4 cifras para descartar años o códigos numéricos grandes.
_PLAZAS_RE = re.compile(
    r"(?:n\.?\s*º?\s*de\s+plazas|n[úu]m(?:\.?|ero)\s+de\s+plazas|n[úu]m\.\s*plazas|plazas(?:\s+(?:convocadas|ofertadas|vacantes))?)"
    r"\s*[:;]\s*(\d{1,4})",
    re.IGNORECASE,
)


def extraer_grupo(texto: str) -> str | None:
    """Devuelve el primer grupo de titulación reconocido, normalizado.

    Ejemplo: "Grupo/Subgrupo A1" -> "A1", "grupo C2" -> "C2".
    Si no hay coincidencia con un código válido, devuelve None.
    """
    if not texto:
        return None
    for m in _GRUPO_RE.finditer(texto):
        grupo = m.group(1).upper()
        if grupo in _GRUPOS_VALIDOS:
            return grupo
    return None


def extraer_num_plazas(texto: str) -> int | None:
    """Devuelve el número de plazas convocadas, o None si no se encuentra.

    Reconoce frases tipo "N.º de plazas: 12", "número de plazas convocadas: 12".
    Se queda con la primera aparición, que suele ser la cifra principal.
    """
    if not texto:
        return None
    m = _PLAZAS_RE.search(texto)
    if not m:
        return None
    n = int(m.group(1))
    return n if n > 0 else None
