"""Orquestación común de la ejecución de un scraper (CLI).

Centraliza el flujo que antes se repetía en cada módulo: ejecutar el pipeline,
volcar JSON opcional, decidir dry-run vs upsert y registrar la ejecución en
`ingest_runs` (éxito o error) para la página /estado.
"""

from __future__ import annotations

import json
from pathlib import Path

from .base import BaseScraper
from .db import has_database, record_failed_run, upsert


def execute(scraper: BaseScraper, *, dry_run: bool = False, out: str | None = None) -> int:
    """Ejecuta el scraper y persiste. Devuelve el código de salida del proceso."""
    use_db = has_database() and not dry_run

    try:
        convocatorias = scraper.run()
    except Exception as exc:  # noqa: BLE001 — queremos registrar cualquier fallo
        if use_db:
            record_failed_run(scraper.fuente(), f"{type(exc).__name__}: {exc}")
        raise

    print(f"{scraper.codigo.upper()}: {len(convocatorias)} convocatorias.")

    if out:
        path = Path(out)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(convocatorias, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Escrito {path}")

    if not use_db:
        if not dry_run:
            print("Sin DATABASE_URL: modo dry-run (no se escribe en base de datos).")
        return 0

    nuevas, actualizadas = upsert(convocatorias, scraper.fuente())
    print(f"Upsert: {nuevas} nuevas, {actualizadas} actualizadas.")
    return 0
