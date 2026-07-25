"""Scraper del Boletín Oficial de la Junta de Andalucía (BOJA).

Usa el feed Atom de distribución de la sección **2.2. Oposiciones, concursos y
otras convocatorias**, que refleja el último BOJA publicado:

    https://www.juntadeandalucia.es/boja/distribucion/s53.xml

Cada entrada trae título, enlace, fecha (<updated>) y, en el contenido XHTML,
el organismo convocante. Licencia: reutilización de datos públicos citando la
fuente (aviso legal de la Junta de Andalucía).

Limitación conocida (MVP): el feed de distribución contiene la sección del
boletín más reciente. El cron diario cubre la publicación del día; el upsert es
idempotente por id, así que repetir es inocuo. Para históricos habría que
recorrer los sumarios por número de boletín.

Uso:
    python -m boja --dry-run
    python -m boja --out ../out/boja.json
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import UTC, datetime
from typing import Any

import httpx

from common.base import BaseScraper
from common.db import has_database, upsert

FEED_URL = "https://www.juntadeandalucia.es/boja/distribucion/s53.xml"
USER_AGENT = "OpoAlerta/0.1 (+https://opoalerta.es; civic open-data scraper)"

# El feed debe seguir siendo la sección de oposiciones; si cambia, fallamos fuerte.
SECCION_ESPERADA = "Oposiciones"

_ID_RE = re.compile(r"/boja/(\d{4})/(\d+)/(\d+)\.html")
_ORGANISMO_RE = re.compile(r"<strong>\s*Organismo:\s*</strong>\s*(.*?)\s*</p>", re.S | re.I)
_TAG_RE = re.compile(r"<[^>]+>")


def _text(fragment: str) -> str:
    import html as _html

    return _html.unescape(_TAG_RE.sub("", fragment)).strip()


class BojaScraper(BaseScraper):
    codigo = "boja"
    nombre = "Boletín Oficial de la Junta de Andalucía"
    licencia = "Reutilización de datos públicos citando fuente (aviso legal Junta de Andalucía)"

    def fetch(self) -> str:
        headers = {"Accept": "application/atom+xml", "User-Agent": USER_AGENT}
        resp = httpx.get(FEED_URL, headers=headers, timeout=30, follow_redirects=True)
        resp.raise_for_status()
        return resp.text

    def parse(self, raw: str) -> list[dict[str, Any]]:
        # Comprobación defensiva: el feed debe ser el de oposiciones.
        feed_title = re.search(r"<feed[^>]*>.*?<title>(.*?)</title>", raw, re.S)
        if not feed_title or SECCION_ESPERADA.lower() not in feed_title.group(1).lower():
            raise ValueError(
                f"El feed de BOJA no es el de oposiciones (título: "
                f"{feed_title.group(1) if feed_title else 'ausente'!r})"
            )

        registros: list[dict[str, Any]] = []
        for entry in re.findall(r"<entry>(.*?)</entry>", raw, re.S):
            titulo_m = re.search(r"<title>(.*?)</title>", entry, re.S)
            link_m = re.search(r'<link[^>]*href="([^"]+)"', entry)
            updated_m = re.search(r"<updated>(.*?)</updated>", entry)
            organismo_m = _ORGANISMO_RE.search(entry)
            if not (titulo_m and link_m):
                continue
            registros.append(
                {
                    "titulo": _text(titulo_m.group(1)),
                    "url": link_m.group(1).strip(),
                    "updated": (updated_m.group(1).strip() if updated_m else None),
                    "organismo": (_text(organismo_m.group(1)) if organismo_m else ""),
                }
            )
        return registros

    def normalize(self, registro: dict[str, Any]) -> dict[str, Any]:
        url = registro["url"]
        m = _ID_RE.search(url)
        ident = f"{m.group(1)}-{m.group(2)}-{m.group(3)}" if m else url.rsplit("/", 1)[-1]
        # fecha de publicación desde <updated> (YYYY-MM-DD); si falta, hoy.
        updated = registro.get("updated")
        fecha = (
            updated[:10]
            if updated and re.match(r"\d{4}-\d{2}-\d{2}", updated)
            else datetime.now(UTC).date().isoformat()
        )
        return {
            "id": f"boja:{ident}",
            "titulo": registro["titulo"],
            "organismo": registro["organismo"] or "Junta de Andalucía",
            "ambito": "autonomico",
            "ccaa": "AN",
            "tipo_acceso": _tipo_acceso(registro["titulo"]),
            "fecha_publicacion": fecha,
            "url_oficial": url,
            "fuente": self.fuente(),
            "fecha_ingesta": datetime.now(UTC).isoformat(),
        }


def _tipo_acceso(titulo: str) -> str | None:
    t = titulo.lower()
    if "concurso-oposición" in t or "concurso oposición" in t:
        return "concurso_oposicion"
    if "concurso" in t:
        return "concurso"
    if "oposición" in t or "oposiciones" in t:
        return "oposicion"
    if "bolsa" in t:
        return "bolsa"
    return None


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Ingesta de oposiciones del BOJA")
    p.add_argument("--dry-run", action="store_true", help="No escribe en base de datos.")
    p.add_argument("--out", help="Ruta de un JSON donde volcar las convocatorias.")
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    scraper = BojaScraper()

    convocatorias = scraper.run()
    print(f"BOJA: {len(convocatorias)} convocatorias (sección 2.2 Oposiciones).")

    if args.out:
        from pathlib import Path

        out = Path(args.out)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(convocatorias, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Escrito {out}")

    if args.dry_run or not has_database():
        if not args.dry_run:
            print("Sin DATABASE_URL: modo dry-run (no se escribe en base de datos).")
        return 0

    nuevas, actualizadas = upsert(convocatorias, scraper.fuente())
    print(f"Upsert: {nuevas} nuevas, {actualizadas} actualizadas.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
