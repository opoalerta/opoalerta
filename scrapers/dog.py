"""Scraper del Diario Oficial de Galicia (DOG).

El DOG publica cada día un sumario por secciones en HTML server-side:

    https://www.xunta.gal/dog/Publicados/YYYY/YYYYMMDD/SeccionesN_gl.html

La sección **"IV. Oposicións e concursos"** está en uno de esos ficheros (el
número N varía según qué secciones haya ese día). La portada enlaza la última
fecha publicada. Licencia: reutilización de datos públicos citando la fuente
(Xunta de Galicia).

Uso:
    python -m dog --dry-run
"""

from __future__ import annotations

import argparse
import html
import re
import sys
from datetime import UTC, date, datetime
from typing import Any

import httpx

from common.base import BaseScraper
from common.http import get as http_get
from common.runner import execute

HOME_URL = "https://www.xunta.gal/dog"
BASE = "https://www.xunta.gal"
SECCION_OPOSICIONES = "Oposicións e concursos"

_FECHA_RE = re.compile(r"/dog/Publicados/\d{4}/(\d{8})/")
_ITEM_RE = re.compile(
    r'<p class="dog-toc-organismo">(?P<org>.*?)</p>'
    r'|<li class="dog-toc-sumario">\s*<a href="(?P<url>[^"]+)"[^>]*>(?P<titulo>.*?)</a>',
    re.S,
)
_ANUNCIO_RE = re.compile(r"/(Anuncio[^/]+?)_\w+\.html")


def _clean(fragment: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", fragment))).strip()


class DogScraper(BaseScraper):
    codigo = "dog"
    nombre = "Diario Oficial de Galicia"
    licencia = "Reutilización de datos públicos citando fuente (Xunta de Galicia)"

    def fetch(self) -> str:
        home = http_get(HOME_URL).text
        fechas = _FECHA_RE.findall(home)
        if not fechas:
            raise ValueError("No se encontró ninguna fecha de DOG en la portada")
        ultima = max(fechas)  # YYYYMMDD
        self.fecha = date(int(ultima[:4]), int(ultima[4:6]), int(ultima[6:8]))
        # La sección de oposiciones está en uno de los ficheros SeccionesN_gl.html.
        for n in range(1, 8):
            url = f"{BASE}/dog/Publicados/{ultima[:4]}/{ultima}/Secciones{n}_gl.html"
            try:
                resp = http_get(url)
            except httpx.HTTPStatusError:
                break  # no hay más secciones ese día
            if SECCION_OPOSICIONES in resp.text:
                return resp.text
        return ""  # ese día no hay sección de oposiciones

    def parse(self, raw: str) -> list[dict[str, Any]]:
        if not raw:
            return []
        if SECCION_OPOSICIONES not in raw:
            raise ValueError("El fragmento del DOG no es la sección de oposiciones")

        registros: list[dict[str, Any]] = []
        organismo = ""
        for m in _ITEM_RE.finditer(raw):
            if m.group("org") is not None:
                organismo = _clean(m.group("org"))
                continue
            url = m.group("url")
            anuncio = _ANUNCIO_RE.search(url)
            registros.append(
                {
                    "id_dog": anuncio.group(1) if anuncio else url.rsplit("/", 1)[-1],
                    "titulo": _clean(m.group("titulo")),
                    "organismo": organismo,
                    "url": BASE + url,
                }
            )
        return registros

    def normalize(self, registro: dict[str, Any]) -> dict[str, Any]:
        ident = re.sub(r"[^a-z0-9]+", "-", registro["id_dog"].lower()).strip("-")
        return {
            "id": f"dog:{ident}",
            "titulo": registro["titulo"],
            "organismo": registro["organismo"] or "Xunta de Galicia",
            "ambito": "autonomico",
            "ccaa": "GA",
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
    if "proceso selectivo" in t or "oposición" in t or "oposicións" in t:
        return "oposicion"
    if "concurso" in t:
        return "concurso"
    if "bolsa" in t or "listas" in t:
        return "bolsa"
    return None


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Ingesta de oposiciones del DOG (Galicia)")
    p.add_argument("--dry-run", action="store_true", help="No escribe en base de datos.")
    p.add_argument("--out", help="Ruta de un JSON donde volcar las convocatorias.")
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    return execute(DogScraper(), dry_run=args.dry_run, out=args.out)


if __name__ == "__main__":
    sys.exit(main())
