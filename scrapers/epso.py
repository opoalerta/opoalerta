"""Scraper de las oposiciones de la Unión Europea (EPSO / EU Careers).

Las convocatorias de la UE (EPSO) están abiertas a nacionales de cualquier país
de la UE, así que **todos los españoles pueden presentarse**. Se listan en:

    https://eu-careers.europa.eu/es/job-opportunities/in-progress

(versión en español, tabla server-side con `<tr class="job-row">`: título +
enlace + referencia EPSO). El prefijo de la referencia marca el tipo:
AD/AST = oposición permanente, CAST = agente contractual.

No hay API/RSS oficial. Contenido reutilizable (Decisión 2011/833/UE, cita fuente).

Uso:
    python -m epso --dry-run
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

LISTA_URL = "https://eu-careers.europa.eu/es/job-opportunities/in-progress"
BASE = "https://eu-careers.europa.eu"

_ROW_RE = re.compile(r'<tr class="job-row">(.*?)</tr>', re.S)
_TITULO_RE = re.compile(r'views-field-title[^>]*>\s*<a href="([^"]+)"[^>]*>(.*?)</a>', re.S)
_REF_RE = re.compile(r"epso-reference-number[^>]*>(.*?)</td>", re.S)


def _clean(fragment: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", fragment))).strip()


def _tipo(ref: str) -> str:
    r = ref.upper()
    if "CAST" in r:
        return "contrato"
    if "/AD/" in r or "/AST" in r:
        return "oposicion"
    if "TA/" in r or "TEMPORAL" in r:
        return "temporal"
    return "otro"


def _id_ref(ref: str, url: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", ref.lower().replace("epso/", "")).strip("-")
    return slug or url.rstrip("/").rsplit("/", 1)[-1]


def _fecha_pub(ref: str) -> str:
    """Fecha estable derivada del año de la referencia (la lista no da fecha).
    No usa 'hoy' para que EPSO no copara el orden del listado por fecha."""
    seg = re.split(r"[-–—]", ref.split("/")[-1])[0].strip() if ref else ""
    if seg.isdigit():
        year = int(seg)
        if year < 100:
            year += 2000
        return f"{year}-01-01"
    return f"{date.today().year}-01-01"


class EpsoScraper(BaseScraper):
    codigo = "epso"
    nombre = "Oposiciones de la Unión Europea (EPSO)"
    licencia = "Contenido de la UE reutilizable (Decisión 2011/833/UE), citando la fuente"

    def fetch(self) -> str:
        return http_get(LISTA_URL).text

    def parse(self, raw: str) -> list[dict[str, Any]]:
        registros: list[dict[str, Any]] = []
        for row in _ROW_RE.findall(raw):
            tm = _TITULO_RE.search(row)
            if not tm:
                continue
            rm = _REF_RE.search(row)
            ref = _clean(rm.group(1)) if rm else ""
            registros.append(
                {
                    "url": BASE + tm.group(1),
                    "titulo": _clean(tm.group(2)),
                    "ref": ref,
                }
            )
        # Si la página cargó pero no hay filas parseables, el formato cambió.
        if "job-row" in raw and not registros:
            raise ValueError("La lista de EPSO no trae filas parseables (¿cambió el formato?)")
        return registros

    def normalize(self, registro: dict[str, Any]) -> dict[str, Any]:
        ref = registro["ref"]
        titulo = registro["titulo"]
        # Marca el tipo/referencia en el título (visible en tarjeta y ficha).
        if ref:
            titulo = f"{titulo} ({ref})"
        return {
            "id": f"epso:{_id_ref(ref, registro['url'])}",
            "titulo": titulo,
            "organismo": "Unión Europea (EPSO)",
            "ambito": "europeo",
            "ccaa": None,
            "tipo_acceso": _tipo(ref),
            "fecha_publicacion": _fecha_pub(ref),
            "url_oficial": registro["url"],
            "fuente": self.fuente(),
            "fecha_ingesta": datetime.now(UTC).isoformat(),
        }


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Ingesta de oposiciones de la UE (EPSO)")
    p.add_argument("--dry-run", action="store_true", help="No escribe en base de datos.")
    p.add_argument("--out", help="Ruta de un JSON donde volcar las convocatorias.")
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    return execute(EpsoScraper(), dry_run=args.dry_run, out=args.out)


if __name__ == "__main__":
    sys.exit(main())
