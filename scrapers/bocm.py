"""Scraper del Boletín Oficial de la Comunidad de Madrid (BOCM).

El BOCM publica un sumario diario en XML. La portada enlaza el del día, así que
no hay que adivinar el número de boletín:

    https://www.bocm.es/boletin/CM_Boletin_BOCM/YYYY/MM/DD/BOCM-YYYYMMDDNNN.xml

Se extraen las disposiciones del apartado **B) Autoridades y Personal**, que
recoge convocatorias, procesos selectivos y provisión de puestos. Licencia:
reutilización de datos públicos citando la fuente (aviso legal del BOCM).

Uso:
    python -m bocm --dry-run
    python -m bocm --out ../out/bocm.json
"""

from __future__ import annotations

import argparse
import re
import sys
import xml.etree.ElementTree as ET
from datetime import UTC, datetime
from typing import Any

import httpx

from common.base import BaseScraper
from common.runner import execute

HOME_URL = "https://www.bocm.es/"
SUMARIO_RE = re.compile(r"/boletin/CM_Boletin_BOCM/\d{4}/\d{2}/\d{2}/BOCM-\d+\.xml")
APARTADO_OPOSICIONES = "Autoridades y Personal"
USER_AGENT = "OpoAlerta/0.1 (+https://opoalerta.es; civic open-data scraper)"


class BocmScraper(BaseScraper):
    codigo = "bocm"
    nombre = "Boletín Oficial de la Comunidad de Madrid"
    licencia = "Reutilización de datos públicos citando fuente (aviso legal BOCM)"

    def fetch(self) -> str:
        headers = {"User-Agent": USER_AGENT}
        home = httpx.get(HOME_URL, headers=headers, timeout=30, follow_redirects=True)
        home.raise_for_status()
        m = SUMARIO_RE.search(home.text)
        if not m:
            raise ValueError("No se encontró el enlace al sumario XML en la portada del BOCM")
        url = "https://www.bocm.es" + m.group(0)
        resp = httpx.get(url, headers=headers, timeout=30, follow_redirects=True)
        resp.raise_for_status()
        return resp.text

    def parse(self, raw: str) -> list[dict[str, Any]]:
        root = ET.fromstring(raw)
        if root.tag != "sumario":
            raise ValueError(f"El XML del BOCM no es un sumario (raíz: {root.tag!r})")

        fecha = self._fecha(root)
        parent = {child: p for p in root.iter() for child in p}

        def ancestor_attr(el: ET.Element, tag: str, attr: str) -> str:
            cur: ET.Element | None = el
            while cur is not None:
                if cur.tag == tag:
                    return cur.get(attr, "")
                cur = parent.get(cur)
            return ""

        registros: list[dict[str, Any]] = []
        vistos: set[str] = set()
        for disp in root.iter("disposicion"):
            ident = (disp.findtext("identificador") or "").strip()
            if not ident or ident in vistos:
                continue
            if APARTADO_OPOSICIONES not in ancestor_attr(disp, "apartado", "nombre"):
                continue
            vistos.add(ident)
            registros.append(
                {
                    "identificador": ident,
                    "titulo": re.sub(r"\s+", " ", disp.findtext("titulo") or "").strip(),
                    "organismo": ancestor_attr(disp, "organismo", "nombre").strip(),
                    "url_html": (disp.findtext("url_html") or "").strip(),
                    "fecha": fecha,
                }
            )
        return registros

    def normalize(self, registro: dict[str, Any]) -> dict[str, Any]:
        ident = registro["identificador"]
        url = registro["url_html"] or f"https://www.bocm.es/{ident.lower()}"
        return {
            "id": f"bocm:{ident}",
            "titulo": registro["titulo"],
            "organismo": registro["organismo"] or "Comunidad de Madrid",
            "ambito": "autonomico",
            "ccaa": "MD",
            "tipo_acceso": _tipo_acceso(registro["titulo"]),
            "fecha_publicacion": registro["fecha"],
            "url_oficial": url,
            "fuente": self.fuente(),
            "fecha_ingesta": datetime.now(UTC).isoformat(),
        }

    @staticmethod
    def _fecha(root: ET.Element) -> str:
        # metadatos/fecha_publicacion viene como YYYY/MM/DD.
        raw = (root.findtext(".//fecha_publicacion") or "").strip()
        if re.fullmatch(r"\d{4}/\d{2}/\d{2}", raw):
            return raw.replace("/", "-")
        return datetime.now(UTC).date().isoformat()


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
    if "libre designación" in t or "libre desiganción" in t:
        return "otro"
    return None


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Ingesta de oposiciones del BOCM")
    p.add_argument("--dry-run", action="store_true", help="No escribe en base de datos.")
    p.add_argument("--out", help="Ruta de un JSON donde volcar las convocatorias.")
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    return execute(BocmScraper(), dry_run=args.dry_run, out=args.out)


if __name__ == "__main__":
    sys.exit(main())
