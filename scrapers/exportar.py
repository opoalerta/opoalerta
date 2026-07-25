"""Exporta las convocatorias a CSV y JSON (dump público de datos abiertos).

Se publica mensualmente en GitHub Releases (ver .github/workflows/dump.yml).
Licencia de los datos: ODbL-1.0 (data/LICENSE), con atribución a las fuentes
oficiales.

Uso:
    python -m exportar --out ../out
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import sys
from pathlib import Path
from typing import Any

COLUMNAS = [
    "id",
    "titulo",
    "organismo",
    "ambito",
    "ccaa",
    "cuerpo",
    "grupo",
    "titulacion_requerida",
    "num_plazas",
    "tipo_acceso",
    "fecha_publicacion",
    "fecha_fin_plazo",
    "url_oficial",
    "fuente_codigo",
    "fecha_ingesta",
]

SELECT_SQL = """
SELECT id, titulo, organismo, ambito, ccaa, cuerpo, grupo,
       titulacion_requerida, num_plazas, tipo_acceso,
       fecha_publicacion::text, fecha_fin_plazo::text,
       url_oficial, fuente_codigo, fecha_ingesta::text
FROM convocatorias
ORDER BY fecha_publicacion DESC, id
"""


def escribir(rows: list[dict[str, Any]], outdir: Path) -> None:
    """Escribe convocatorias.json y convocatorias.csv en outdir."""
    outdir.mkdir(parents=True, exist_ok=True)
    (outdir / "convocatorias.json").write_text(
        json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    with (outdir / "convocatorias.csv").open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNAS)
        writer.writeheader()
        writer.writerows(rows)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Exporta convocatorias a CSV y JSON")
    parser.add_argument("--out", default="../out", help="Directorio de salida.")
    args = parser.parse_args(argv)

    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        print("Sin DATABASE_URL: nada que exportar.")
        return 0

    import psycopg
    from psycopg.rows import dict_row

    with psycopg.connect(dsn) as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute(SELECT_SQL)
        rows = cur.fetchall()

    escribir(rows, Path(args.out))
    print(f"Exportadas {len(rows)} convocatorias a {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
