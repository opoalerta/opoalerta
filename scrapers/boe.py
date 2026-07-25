"""Scraper del Boletín Oficial del Estado (BOE).

Usa la API de datos abiertos del BOE (sumario diario en JSON) y extrae la
sección **II.B — Oposiciones y concursos** (código de sección ``2B``).

API: https://www.boe.es/datosabiertos/api/boe/sumario/YYYYMMDD (Accept: application/json)
Licencia: reutilización permitida citando fuente (Aviso legal del BOE).

Uso:
    python -m boe --dry-run                 # sumario de hoy, sin base de datos
    python -m boe --fecha 2025-07-23        # una fecha concreta
    python -m boe --out out/boe.json        # además, escribe el JSON resultante
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import UTC, date, datetime
from typing import Any

import httpx

from common.base import BaseScraper
from common.db import has_database, upsert

API_URL = "https://www.boe.es/datosabiertos/api/boe/sumario/{fecha}"
SECCION_OPOSICIONES = "2B"
USER_AGENT = "OpoAlerta/0.1 (+https://opoalerta.es; civic open-data scraper)"


def _as_list(value: Any) -> list[Any]:
    """El BOE devuelve un dict cuando hay un solo elemento y una lista cuando hay varios."""
    if value is None:
        return []
    return value if isinstance(value, list) else [value]


class BoeScraper(BaseScraper):
    codigo = "boe"
    nombre = "Boletín Oficial del Estado"
    licencia = "Reutilización permitida citando fuente (Aviso legal BOE)"

    def fetch(self) -> dict[str, Any]:
        url = API_URL.format(fecha=self.fecha.strftime("%Y%m%d"))
        headers = {"Accept": "application/json", "User-Agent": USER_AGENT}
        resp = httpx.get(url, headers=headers, timeout=30, follow_redirects=True)
        resp.raise_for_status()
        return resp.json()

    def parse(self, raw: dict[str, Any]) -> list[dict[str, Any]]:
        registros: list[dict[str, Any]] = []
        diarios = _as_list(raw.get("data", {}).get("sumario", {}).get("diario"))
        for diario in diarios:
            for seccion in _as_list(diario.get("seccion")):
                if str(seccion.get("codigo")) != SECCION_OPOSICIONES:
                    continue
                for depto in _as_list(seccion.get("departamento")):
                    organismo = depto.get("nombre", "")
                    for epigrafe in _as_list(depto.get("epigrafe")):
                        for item in _as_list(epigrafe.get("item")):
                            registros.append(
                                {
                                    "identificador": item.get("identificador"),
                                    "titulo": item.get("titulo", ""),
                                    "organismo": organismo,
                                    "url_html": item.get("url_html"),
                                }
                            )
        return registros

    def normalize(self, registro: dict[str, Any]) -> dict[str, Any]:
        ident = registro["identificador"]
        url = registro.get("url_html") or f"https://www.boe.es/diario_boe/txt.php?id={ident}"
        return {
            "id": f"boe:{ident}",
            "titulo": registro["titulo"],
            "organismo": registro["organismo"],
            "ambito": "estatal",
            "ccaa": None,
            "fecha_publicacion": self.fecha.isoformat(),
            "url_oficial": url,
            "fuente": self.fuente(),
            "fecha_ingesta": datetime.now(UTC).isoformat(),
        }


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Ingesta de oposiciones del BOE")
    p.add_argument("--fecha", help="Fecha del sumario (YYYY-MM-DD). Por defecto, hoy.")
    p.add_argument("--dry-run", action="store_true", help="No escribe en base de datos.")
    p.add_argument("--out", help="Ruta de un JSON donde volcar las convocatorias.")
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    fecha = date.fromisoformat(args.fecha) if args.fecha else date.today()
    scraper = BoeScraper(fecha=fecha)

    convocatorias = scraper.run()
    print(f"BOE {fecha.isoformat()}: {len(convocatorias)} convocatorias (sección II.B).")

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
