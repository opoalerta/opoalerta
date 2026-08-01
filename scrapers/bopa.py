"""Scraper del Boletín Oficial del Principado de Asturias (BOPA).

El BOPA vive en un portal Liferay que no expone sumario por ruta de fecha
(`/bopa/AAAA/MM/DD` devuelve 404), pero sí lo renderiza en servidor bajo:

    https://miprincipado.asturias.es/bopa/ultimos-boletines?p_r_p_summaryLastBopa=true

Un día concreto se pide con `?p_r_p_summaryDate=DD/MM/AAAA`, que es lo que usa
la fixture del test.

El sumario está en `<div id="bopa-boletin">` con esta jerarquía:

    <h4> parte      — «I. Principado de Asturias», «IV. Administración Local»…
    <h5> sección    — «AUTORIDADES Y PERSONAL», «OTRAS DISPOSICIONES»…
    <h6> organismo
    <dl><dt> título … <strong>[Cód. AAAA-NNNNN]</strong></dt></dl>

El PDF de cada disposición es `/bopa/AAAA/MM/DD/CODIGO.pdf`, y el del boletín
entero `/bopa/AAAA/MM/DD/AAAAMMDD.pdf`, de donde se saca la fecha.

**Por qué hay filtro por palabras.** Los demás boletines tienen una subsección
propia de oposiciones que se puede tomar entera; el BOPA no. Su sección de
personal mezcla convocatorias con actos administrativos (sustituciones
temporales, delegaciones de competencias, ceses). Publicar un decreto de
sustitución como si fuera una convocatoria es ruido, así que se filtra por
marcadores de proceso selectivo. Es un filtro positivo: si el título no dice
que hay un proceso, no entra.

Los datos abiertos del BOPA en datos.gob.es (`a03002951-bopa1` y `-bopa2`)
tienen mejor estructura, pero el último año publicado es 2024, así que no
sirven para una ingesta diaria. Quedan documentados por si se reactivan.

Licencia: reutilización de información del sector público citando la fuente
(Principado de Asturias).

Uso:
    python -m bopa --dry-run
"""

from __future__ import annotations

import argparse
import html
import re
import sys
from datetime import UTC, date, datetime
from typing import Any

from common.base import BaseScraper
from common.http import get as http_get
from common.runner import execute

BASE = "https://miprincipado.asturias.es"
SUMARIO_URL = f"{BASE}/bopa/ultimos-boletines?p_r_p_summaryLastBopa=true"
SEDE = "https://sede.asturias.es"

# La sección de personal. Las convocatorias locales van en AYUNTAMIENTOS, pero
# allí se mezclan con presupuestos y padrones y el título rara vez basta para
# distinguirlas; se deja fuera hasta tener una señal fiable.
SECCION_PERSONAL = "AUTORIDADES Y PERSONAL"

# Fecha y número tomados del PDF del boletín completo: /bopa/AAAA/MM/DD/AAAAMMDD.pdf
_BOLETIN_RE = re.compile(r"/bopa/(\d{4})/(\d{2})/(\d{2})/(\d{8})\.pdf")

_CODIGO_RE = re.compile(r"\[Cód\.\s*(\d{4}-\d+)\]")

# Recorre el sumario en orden de documento.
_TOKEN_RE = re.compile(
    r"<h5>(?P<sec>.*?)</h5>|<h6[^>]*>(?P<org>.*?)</h6>|<dt>(?P<item>.*?)</dt>",
    re.S,
)

# Marcadores de que el título anuncia un proceso de selección o provisión.
_ES_CONVOCATORIA_RE = re.compile(
    r"convocatoria|se convoca|convocan|proceso selectivo|procesos selectivos"
    r"|pruebas selectivas|oposici|concurso|bolsa de (?:empleo|trabajo)"
    r"|lista[s]? de empleo|bolsín|promoción interna|provisión de puesto"
    r"|libre designación|lista[s]? de reserva",
    re.I,
)


def _clean(fragment: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", fragment))).strip()


def _tipo_acceso(titulo: str) -> str | None:
    t = titulo.lower()
    if "concurso-oposición" in t or "concurso oposición" in t:
        return "concurso_oposicion"
    if "promoción interna" in t:
        return "promocion_interna"
    if "proceso selectivo" in t or "pruebas selectivas" in t or "oposici" in t:
        return "oposicion"
    if "bolsa" in t or "lista de empleo" in t or "lista de reserva" in t or "bolsín" in t:
        return "bolsa"
    if "concurso" in t or "libre designación" in t or "provisión de puesto" in t:
        return "concurso"
    return None


class BopaScraper(BaseScraper):
    codigo = "bopa"
    nombre = "Boletín Oficial del Principado de Asturias"
    licencia = "Reutilización de información pública citando fuente (Principado de Asturias)"

    def fetch(self) -> str:
        return http_get(SUMARIO_URL).text

    def parse(self, raw: str) -> list[dict[str, Any]]:
        if not raw:
            return []

        inicio = raw.find('<div id="bopa-boletin"')
        if inicio == -1:
            raise ValueError("El fragmento no contiene el sumario del BOPA")

        # La fecha va antes del sumario, en el enlace al boletín completo.
        boletin = _BOLETIN_RE.search(raw)
        if not boletin:
            raise ValueError("No se encontró el enlace al PDF del boletín")
        anio, mes, dia, _ = boletin.groups()
        self.fecha = date(int(anio), int(mes), int(dia))

        registros: list[dict[str, Any]] = []
        seccion = ""
        organismo = ""

        for m in _TOKEN_RE.finditer(raw[inicio:]):
            if m.group("sec") is not None:
                seccion = _clean(m.group("sec"))
                organismo = ""
                continue
            if m.group("org") is not None:
                organismo = _clean(m.group("org"))
                continue

            if seccion != SECCION_PERSONAL:
                continue

            bruto = m.group("item")
            codigo = _CODIGO_RE.search(bruto)
            if not codigo:
                continue

            titulo = _CODIGO_RE.sub("", _clean(bruto)).strip()
            if not _ES_CONVOCATORIA_RE.search(titulo):
                continue

            registros.append(
                {
                    "codigo": codigo.group(1),
                    "titulo": titulo,
                    "organismo": organismo,
                }
            )

        return registros

    def normalize(self, registro: dict[str, Any]) -> dict[str, Any]:
        codigo = registro["codigo"]
        ruta = self.fecha.strftime("%Y/%m/%d")
        return {
            "id": f"bopa:{codigo}",
            "titulo": registro["titulo"],
            "organismo": registro["organismo"] or "Principado de Asturias",
            "ambito": "autonomico",
            "ccaa": "AS",
            "tipo_acceso": _tipo_acceso(registro["titulo"]),
            "fecha_publicacion": self.fecha.isoformat(),
            "url_oficial": f"{SEDE}/bopa/{ruta}/{codigo}.pdf",
            "fuente": self.fuente(),
            "fecha_ingesta": datetime.now(UTC).isoformat(),
        }


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Ingesta de oposiciones del BOPA (Asturias)")
    p.add_argument("--dry-run", action="store_true", help="No escribe en base de datos.")
    p.add_argument("--out", help="Ruta de un JSON donde volcar las convocatorias.")
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    return execute(BopaScraper(), dry_run=args.dry_run, out=args.out)


if __name__ == "__main__":
    sys.exit(main())
