"""Scraper del Boletín Oficial de Castilla y León (BOCYL).

BOCYL no ofrece un feed estructurado por disposición, pero su página de boletín
diario (`boletin.do?fechaBoletin=DD/MM/YYYY`) trae un sumario HTML con secciones
bien delimitadas. Se extrae la subsección **B.2. Oposiciones y Concursos** (tanto
de la Comunidad como de la Administración Local).

La portada enlaza los últimos boletines; se toma el de fecha más reciente.
Licencia: reutilización de datos públicos citando la fuente (aviso legal JCyL).

Uso:
    python -m bocyl --dry-run
    python -m bocyl --out ../out/bocyl.json
"""

from __future__ import annotations

import argparse
import html
import re
import sys
from datetime import UTC, datetime
from typing import Any

import httpx

from common.base import BaseScraper
from common.runner import execute

HOME_URL = "https://bocyl.jcyl.es/"
BOLETIN_URL = "https://bocyl.jcyl.es/boletin.do?fechaBoletin={fecha}"
BASE = "https://bocyl.jcyl.es/"
USER_AGENT = "OpoAlerta/0.1 (+https://opoalerta.es; civic open-data scraper)"

_FECHA_LINK_RE = re.compile(r"boletin\.do\?fechaBoletin=(\d{2}/\d{2}/\d{4})")
_SECCION_RE = re.compile(r"B\.2\.\s*Oposiciones y Concursos\s*</h4>")
_ID_RE = re.compile(r"(BOCYL-D-(\d{2})(\d{2})(\d{4})-[\d-]+)\.pdf")
_HTML_HREF_RE = re.compile(r"href='([^']*BOCYL-D-[^']+\.do)'")


def _clean(fragment: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", "", fragment)).strip()


class BocylScraper(BaseScraper):
    codigo = "bocyl"
    nombre = "Boletín Oficial de Castilla y León"
    licencia = "Reutilización de datos públicos citando fuente (aviso legal JCyL)"

    def fetch(self) -> str:
        headers = {"User-Agent": USER_AGENT}
        home = httpx.get(HOME_URL, headers=headers, timeout=30, follow_redirects=True)
        home.raise_for_status()
        fechas = _FECHA_LINK_RE.findall(home.text)
        if not fechas:
            raise ValueError("No se encontró ningún boletín en la portada del BOCYL")
        # Fecha más reciente (DD/MM/YYYY → clave YYYYMMDD).
        ultima = max(fechas, key=lambda f: f[6:] + f[3:5] + f[0:2])
        resp = httpx.get(
            BOLETIN_URL.format(fecha=ultima), headers=headers, timeout=30, follow_redirects=True
        )
        resp.raise_for_status()
        return resp.text

    def parse(self, raw: str) -> list[dict[str, Any]]:
        if "BOCYL" not in raw:
            raise ValueError("La página del BOCYL no parece un boletín")

        registros: list[dict[str, Any]] = []
        vistos: set[str] = set()
        for m in _SECCION_RE.finditer(raw):
            start = m.end()
            nxt = re.search(r"<h[34][ >]", raw[start:])
            block = raw[start : start + nxt.start()] if nxt else raw[start:]

            pre = raw[: m.start()]
            ambito = (
                "local"
                if pre.rfind("ADMINISTRACIÓN LOCAL") > pre.rfind("COMUNIDAD DE CASTILLA")
                else "autonomico"
            )

            # Grupos por organismo: <h5 ...>ORG</h5> seguido de sus disposiciones.
            parts = re.split(r"<h5[^>]*>(.*?)</h5>", block, flags=re.S)
            for i in range(1, len(parts), 2):
                organismo = _clean(parts[i])
                body = parts[i + 1]
                for pm in re.finditer(
                    r"<p>(.*?)</p>\s*<ul class=\"descargaBoletin\">(.*?)</ul>", body, re.S
                ):
                    idm = _ID_RE.search(pm.group(2))
                    if not idm:
                        continue
                    ident = idm.group(1)
                    if ident in vistos:
                        continue
                    vistos.add(ident)
                    href = _HTML_HREF_RE.search(pm.group(2))
                    url = BASE + href.group(1) if href else BASE + f"php/{ident}.do"
                    registros.append(
                        {
                            "id_bocyl": ident,
                            "fecha": f"{idm.group(4)}-{idm.group(3)}-{idm.group(2)}",
                            "titulo": _clean(pm.group(1)),
                            "organismo": organismo,
                            "ambito": ambito,
                            "url": url,
                        }
                    )
        return registros

    def normalize(self, registro: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": f"bocyl:{registro['id_bocyl']}",
            "titulo": registro["titulo"],
            "organismo": registro["organismo"] or "Junta de Castilla y León",
            "ambito": registro["ambito"],
            "ccaa": "CL",
            "tipo_acceso": _tipo_acceso(registro["titulo"]),
            "fecha_publicacion": registro["fecha"],
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
    p = argparse.ArgumentParser(description="Ingesta de oposiciones del BOCYL")
    p.add_argument("--dry-run", action="store_true", help="No escribe en base de datos.")
    p.add_argument("--out", help="Ruta de un JSON donde volcar las convocatorias.")
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    return execute(BocylScraper(), dry_run=args.dry_run, out=args.out)


if __name__ == "__main__":
    sys.exit(main())
