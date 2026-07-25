"""Scraper del Butlletí Oficial de les Illes Balears (BOIB).

Flujo: el RSS del BOIB da el último boletín; su página enlaza la Sección II
(Autoridades y Personal); dentro se toma la subsección "Oposiciones y concursos".

    RSS:      https://www.caib.es/eboibfront/es/rss
    Boletín:  https://www.caib.es/eboibfront/es/2026/NNNNN
    Sección:  .../seccion-ii-autoridades-y-personal/NNN

Licencia: reutilización de datos públicos citando la fuente (aviso legal CAIB).

Uso:
    python -m boib --dry-run
"""

from __future__ import annotations

import argparse
import html
import re
import sys
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
from typing import Any

from common.base import BaseScraper
from common.http import get as http_get
from common.runner import execute

RSS_URL = "https://www.caib.es/eboibfront/es/rss"
BASE = "https://www.caib.es"
USER_AGENT = "OpoAlerta/0.1 (+https://opoalerta.es; civic open-data scraper)"

_ORGANISME_RE = re.compile(r'<h3 class="organisme">(.*?)</h3>', re.S)
_RESOL_RE = re.compile(
    r'<li>\s*<p>(?P<titulo>.*?)</p>\s*<p class="registre">\s*'
    r"N[úu]mero de registro\s*(?P<reg>\d+).*?"
    r'<a[^>]*href="(?P<url>[^"]+)"[^>]*class="html"',
    re.S,
)


def _clean(fragment: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", fragment))).strip()


def _abs(url: str) -> str:
    return url if url.startswith("http") else BASE + url


class BoibScraper(BaseScraper):
    codigo = "boib"
    nombre = "Butlletí Oficial de les Illes Balears"
    licencia = "Reutilización de datos públicos citando fuente (aviso legal CAIB)"

    def fetch(self) -> str:
        rss = http_get(RSS_URL).text
        item = re.search(r"<item>(.*?)</item>", rss, re.S)
        if not item:
            raise ValueError("El RSS del BOIB no trae boletines")
        link = re.search(r"<link>(.*?)</link>", item.group(1))
        pub = re.search(r"<pubDate>(.*?)</pubDate>", item.group(1))
        if not link:
            raise ValueError("El item del RSS del BOIB no trae enlace")
        if pub:
            self.fecha = parsedate_to_datetime(pub.group(1).strip()).date()

        boletin = http_get(link.group(1).strip()).text
        sec = re.search(r'href="([^"]*seccion-ii-autoridades-y-personal[^"]*)"', boletin)
        if not sec:
            # No hay Sección II ese día: no hay oposiciones.
            return "<html></html>"
        return http_get(_abs(sec.group(1))).text

    def parse(self, raw: str) -> list[dict[str, Any]]:
        i = raw.find("Oposiciones y concursos")
        if i == -1:
            return []
        block = raw[i:]
        parts = _ORGANISME_RE.split(block)
        registros: list[dict[str, Any]] = []
        for k in range(1, len(parts), 2):
            organismo = _clean(parts[k])
            for m in _RESOL_RE.finditer(parts[k + 1]):
                registros.append(
                    {
                        "reg": m.group("reg"),
                        "titulo": _clean(m.group("titulo")),
                        "organismo": organismo,
                        "url": _abs(m.group("url")),
                    }
                )
        return registros

    def normalize(self, registro: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": f"boib:{self.fecha.year}-{registro['reg']}",
            "titulo": registro["titulo"],
            "organismo": registro["organismo"] or "Govern de les Illes Balears",
            "ambito": "autonomico",
            "ccaa": "IB",
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
    if "concurso" in t or "convocatoria" in t:
        return "concurso"
    if "bolsa" in t or "bolsín" in t:
        return "bolsa"
    return None


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Ingesta de oposiciones del BOIB (Illes Balears)")
    p.add_argument("--dry-run", action="store_true", help="No escribe en base de datos.")
    p.add_argument("--out", help="Ruta de un JSON donde volcar las convocatorias.")
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    return execute(BoibScraper(), dry_run=args.dry_run, out=args.out)


if __name__ == "__main__":
    sys.exit(main())
