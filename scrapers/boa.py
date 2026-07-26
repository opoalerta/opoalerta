"""Scraper del Boletín Oficial de Aragón (BOA).

El BOA se consulta con su CGI BRSCGI. La sección de oposiciones y personal
(`SEC=OPRSS`) de un día devuelve una lista HTML bien estructurada:

    <h4 class="boaemisor">ORGANISMO</h4>
    <h5 class="boatitulo">TÍTULO</h5>
    <a href="...CMD=VERDOC...DOCR=N...">Ver documento completo</a>

La página va en Latin-1. Licencia: reutilización de datos públicos citando la
fuente (aviso legal del Gobierno de Aragón).

Uso:
    python -m boa --dry-run
    python -m boa --fecha 2026-07-24
"""

from __future__ import annotations

import argparse
import html
import re
import sys
from datetime import UTC, date, datetime, timedelta
from typing import Any

from common.base import BaseScraper
from common.http import get as http_get
from common.runner import execute

LISTA_URL = (
    "https://www.boa.aragon.es/cgi-bin/EBOA/BRSCGI"
    "?CMD=VERLST&BASE=BOLE&DOCS=1-500&SEC=OPRSS&SEPARADOR=&PUBL={fecha}"
)
BASE = "https://www.boa.aragon.es"

_ITEM_RE = re.compile(
    r'<h4 class="boaemisor">(?P<emisor>.*?)</h4>|<h5 class="boatitulo">(?P<titulo>.*?)</h5>',
    re.S,
)
_DOCR_RE = re.compile(r"DOCR=(\d+)")
_HREF_RE = re.compile(r'href="([^"]*CMD=VERDOC[^"]*)"')


def _clean(fragment: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", "", fragment)).strip()


class BoaScraper(BaseScraper):
    codigo = "boa"
    nombre = "Boletín Oficial de Aragón"
    licencia = "Reutilización de datos públicos citando fuente (aviso legal Gobierno de Aragón)"

    #: Días hacia atrás que se prueban buscando el último boletín publicado.
    RETROCESO_MAX = 6

    def fetch(self) -> str:
        # El BOA del día puede no estar publicado aún a las 06:00 UTC (o ser fin
        # de semana), así que retrocedemos hasta dar con el último boletín que
        # trae documentos en la sección de oposiciones (SEC=OPRSS).
        base = self.fecha
        for retroceso in range(self.RETROCESO_MAX):
            f = base - timedelta(days=retroceso)
            resp = http_get(LISTA_URL.format(fecha=f.strftime("%Y%m%d")))
            resp.encoding = "iso-8859-15"
            texto = resp.text
            if "DOCR=" in texto:  # ese día hay documentos publicados
                self.fecha = f
                return texto
        self.fecha = base
        return ""  # sin boletín con oposiciones en los últimos días

    def parse(self, raw: str) -> list[dict[str, Any]]:
        registros: list[dict[str, Any]] = []
        emisor = ""
        for m in _ITEM_RE.finditer(raw):
            if m.group("emisor") is not None:
                emisor = _clean(m.group("emisor"))
                continue
            titulo = _clean(m.group("titulo"))
            cola = raw[m.end() : m.end() + 600]
            docr = _DOCR_RE.search(cola)
            href = _HREF_RE.search(cola)
            if not docr:
                continue
            url = BASE + html.unescape(href.group(1)) if href else BASE
            registros.append(
                {"docr": docr.group(1), "titulo": titulo, "organismo": emisor, "url": url}
            )
        # Si hay una lista de documentos pero no extrajimos nada, el formato cambió.
        # Sin lista (p. ej. día sin boletín) devolvemos 0 sin error.
        if "Lista de documentos" in raw and not registros:
            raise ValueError("Lista del BOA sin items parseables (¿cambió el formato?)")
        return registros

    def normalize(self, registro: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": f"boa:{self.fecha.strftime('%Y%m%d')}-{registro['docr']}",
            "titulo": registro["titulo"],
            "organismo": registro["organismo"] or "Gobierno de Aragón",
            "ambito": "autonomico",
            "ccaa": "AR",
            "tipo_acceso": _tipo_acceso(registro["titulo"]),
            "fecha_publicacion": self.fecha.isoformat(),
            "url_oficial": registro["url"],
            "fuente": self.fuente(),
            "fecha_ingesta": datetime.now(UTC).isoformat(),
        }


def _tipo_acceso(titulo: str) -> str | None:
    t = titulo.lower()
    if "concurso-oposición" in t or "concurso oposición" in t:
        return "concurso_oposicion"
    if "proceso selectivo" in t or "oposición" in t or "oposiciones" in t:
        return "oposicion"
    if "concurso" in t:
        return "concurso"
    if "bolsa" in t:
        return "bolsa"
    return None


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Ingesta de oposiciones del BOA (Aragón)")
    p.add_argument("--fecha", help="Fecha del boletín (YYYY-MM-DD). Por defecto, hoy.")
    p.add_argument("--dry-run", action="store_true", help="No escribe en base de datos.")
    p.add_argument("--out", help="Ruta de un JSON donde volcar las convocatorias.")
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    fecha = date.fromisoformat(args.fecha) if args.fecha else date.today()
    return execute(BoaScraper(fecha=fecha), dry_run=args.dry_run, out=args.out)


if __name__ == "__main__":
    sys.exit(main())
