"""Scraper del Diario Oficial de Castilla-La Mancha (DOCM).

El DOCM publica el sumario de cada día en HTML server-side:

    https://docm.jccm.es/docm/cambiarBoletin.do?fecha=YYYYMMDD

Las convocatorias están en la parte **"II.- AUTORIDADES Y PERSONAL"**,
subcategoría **"OPOSICIONES Y CONCURSOS"**. Cada organismo va en un
`<h4 class="tituloOrganismo">` y cada disposición en un `<p class="sumario">`
con enlace `descargarArchivo.do?ruta=AÑO/MM/DD/pdf/AÑO_NNNN.pdf`. La portada
del portal enlaza las fechas recientes como `cambiarBoletin.do?fecha=YYYYMMDD`.
Licencia: reutilización de información pública citando la fuente (JCCM).

Uso:
    python -m docm --dry-run
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

HOME_URL = "https://docm.jccm.es/portaldocm/"
SUMARIO_URL = "https://docm.jccm.es/docm/cambiarBoletin.do?fecha={fecha}"
BASE = "https://docm.jccm.es/docm/"
SECCION_PERSONAL = "AUTORIDADES Y PERSONAL"
SECCION_SIGUIENTE = "OTRAS DISPOSICIONES"
SUBSECCION = "OPOSICIONES Y CONCURSOS"

_FECHA_RE = re.compile(r"cambiarBoletin\.do\?fecha=(\d{8})")
_RUTA_RE = re.compile(r"ruta=(\d{4})/(\d{2})/(\d{2})/pdf/(\d{4}_\d+)\.pdf")
# Alternancia en orden de documento: organismo (h4) o disposición (p.sumario).
_ITEM_RE = re.compile(
    r'tituloOrganismo">(?P<org>.*?)</h4>|<p class ?= ?"sumario">(?P<sum>.*?)</p>',
    re.S,
)
_NID_RE = re.compile(r"\s*\[NID [^\]]+\]\s*$")


def _clean(fragment: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", fragment))).strip()


def _tipo_acceso(titulo: str) -> str | None:
    t = titulo.lower()
    if "concurso-oposición" in t or "concurso oposición" in t:
        return "concurso_oposicion"
    if "promoción interna" in t:
        return "promocion_interna"
    if "proceso selectivo" in t or "oposición" in t or "oposiciones" in t:
        return "oposicion"
    if "bolsa" in t or "lista de reserva" in t or "listas de empleo" in t:
        return "bolsa"
    if "concurso" in t:
        return "concurso"
    return None


class DocmScraper(BaseScraper):
    codigo = "docm"
    nombre = "Diario Oficial de Castilla-La Mancha"
    licencia = "Reutilización de información pública citando fuente (JCCM)"

    def fetch(self) -> str:
        home = http_get(HOME_URL).text
        fechas = _FECHA_RE.findall(home)
        if not fechas:
            raise ValueError("No se encontró ninguna fecha de DOCM en la portada")
        ultima = max(fechas)  # YYYYMMDD
        self.fecha = date(int(ultima[:4]), int(ultima[4:6]), int(ultima[6:8]))
        return http_get(SUMARIO_URL.format(fecha=ultima)).text

    def parse(self, raw: str) -> list[dict[str, Any]]:
        if not raw:
            return []
        if SECCION_PERSONAL not in raw:
            if "sumario" in raw or "cambiarBoletin" in raw:
                return []  # sumario del DOCM sin sección de personal ese día
            raise ValueError("El fragmento no es un sumario del DOCM")

        # Aísla II.- AUTORIDADES Y PERSONAL › OPOSICIONES Y CONCURSOS.
        ini = raw.find(SECCION_PERSONAL)
        fin_sec = raw.find(SECCION_SIGUIENTE, ini)
        personal = raw[ini : fin_sec if fin_sec != -1 else len(raw)]
        op = personal.find(SUBSECCION)
        if op == -1:
            return []  # ese día no hay oposiciones y concursos
        sub = personal[op + len(SUBSECCION) :]
        # Termina en la siguiente subcategoría (otro <li> en mayúsculas).
        siguiente = re.search(r"<li>\s*[A-ZÁÉÍÓÚ]", sub)
        if siguiente:
            sub = sub[: siguiente.start()]

        registros: list[dict[str, Any]] = []
        organismo = ""
        for m in _ITEM_RE.finditer(sub):
            if m.group("org") is not None:
                organismo = _clean(m.group("org"))
                continue
            sumario = m.group("sum")
            ruta = _RUTA_RE.search(sumario)
            if not ruta:
                continue
            titulo = _NID_RE.sub("", _clean(sumario))
            registros.append(
                {
                    "anio": ruta.group(1),
                    "mes": ruta.group(2),
                    "dia": ruta.group(3),
                    "doc": ruta.group(4),
                    "titulo": titulo,
                    "organismo": organismo,
                }
            )
        return registros

    def normalize(self, registro: dict[str, Any]) -> dict[str, Any]:
        y, mes, dia, doc = (
            registro["anio"],
            registro["mes"],
            registro["dia"],
            registro["doc"],
        )
        url = f"{BASE}verArchivoHtml.do?ruta={y}/{mes}/{dia}/html/{doc}.html&tipo=rutaDocm"
        return {
            "id": f"docm:{doc.replace('_', '-')}",
            "titulo": registro["titulo"],
            "organismo": registro["organismo"] or "Junta de Comunidades de Castilla-La Mancha",
            "ambito": "autonomico",
            "ccaa": "CM",
            "tipo_acceso": _tipo_acceso(registro["titulo"]),
            "fecha_publicacion": f"{y}-{mes}-{dia}",
            "url_oficial": url,
            "fuente": self.fuente(),
            "fecha_ingesta": datetime.now(UTC).isoformat(),
        }


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Ingesta de oposiciones del DOCM (Castilla-La Mancha)")
    p.add_argument("--dry-run", action="store_true", help="No escribe en base de datos.")
    p.add_argument("--out", help="Ruta de un JSON donde volcar las convocatorias.")
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    return execute(DocmScraper(), dry_run=args.dry_run, out=args.out)


if __name__ == "__main__":
    sys.exit(main())
