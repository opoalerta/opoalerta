"""Pase de enriquecimiento: rellena el plazo de las convocatorias.

Los sumarios no traen el plazo de presentación; está en el cuerpo de cada
disposición. Este pase, desacoplado de los scrapers, recorre las convocatorias
sin plazo revisado, baja el texto de su `url_oficial`, extrae la frase del plazo
(common.plazo) y actualiza:

  - `plazo_texto`      -> la frase literal (siempre que se encuentre).
  - `fecha_fin_plazo`  -> solo si el plazo es en días naturales (exacto).

Marca `plazo_texto = ''` cuando la descarga fue bien pero no había plazo, para
no volver a bajar esa página cada día. Si la descarga falla, deja el registro
sin tocar (se reintenta en la siguiente ejecución).

Uso:
    python -m enriquecer --dry-run   # no escribe; muestra lo que haría
    python -m enriquecer             # enriquece de verdad
    PLAZO_BATCH=100 python -m enriquecer
"""

from __future__ import annotations

import argparse
import html
import os
import re
import sys

import httpx

from common.plazo import calcular_fin, extraer_plazo

BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)

SELECT_SQL = """
    SELECT id, url_oficial, fecha_publicacion, fuente_codigo
    FROM convocatorias
    WHERE plazo_texto IS NULL
      AND fecha_ingesta > now() - interval '45 days'
    ORDER BY fecha_ingesta DESC
    LIMIT %(limit)s
"""

UPDATE_SQL = """
    UPDATE convocatorias
    SET plazo_texto = %(plazo_texto)s,
        fecha_fin_plazo = COALESCE(%(fecha_fin)s, fecha_fin_plazo),
        actualizada_en = now()
    WHERE id = %(id)s
"""


def _descargar_texto(url: str) -> str:
    """Devuelve el texto plano de la disposición. '' si es PDF o no es HTML."""
    resp = httpx.get(
        url,
        headers={"User-Agent": BROWSER_UA, "Accept": "text/html,application/xhtml+xml"},
        timeout=30,
        follow_redirects=True,
    )
    resp.raise_for_status()
    ctype = resp.headers.get("content-type", "").lower()
    if "pdf" in ctype or url.lower().endswith(".pdf"):
        return ""  # de momento no extraemos plazos de PDF
    return html.unescape(re.sub(r"<[^>]+>", " ", resp.text))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Enriquece el plazo de las convocatorias")
    parser.add_argument("--dry-run", action="store_true", help="No escribe; solo muestra.")
    args = parser.parse_args(argv)

    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        print("Sin DATABASE_URL: nada que enriquecer.")
        return 0
    limit = int(os.environ.get("PLAZO_BATCH", "60"))

    import psycopg
    from psycopg.rows import dict_row

    enriquecidas = con_fecha = revisadas = 0
    with psycopg.connect(dsn) as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(SELECT_SQL, {"limit": limit})
            filas = cur.fetchall()
        print(f"{len(filas)} convocatorias sin plazo revisado.")

        for f in filas:
            try:
                texto = _descargar_texto(f["url_oficial"])
            except Exception as exc:  # noqa: BLE001 — fallo de red: reintentar otro día
                print(f"  skip {f['id']}: {type(exc).__name__}", file=sys.stderr)
                continue
            revisadas += 1
            plazo = extraer_plazo(texto)
            if not plazo:
                if not args.dry_run:
                    _update(conn, f["id"], "", None)
                continue
            fin = calcular_fin(f["fecha_publicacion"], plazo)
            fin_iso = fin.isoformat() if fin else None
            enriquecidas += 1
            if fin_iso:
                con_fecha += 1
            marca = "FECHA " + fin_iso if fin_iso else "solo texto"
            print(f"  {f['id']}: {marca} · {plazo['plazo_texto'][:80]}")
            if not args.dry_run:
                _update(conn, f["id"], plazo["plazo_texto"], fin_iso)
        if not args.dry_run:
            conn.commit()

    print(
        f"Revisadas: {revisadas}. Con plazo: {enriquecidas} "
        f"(con fecha de fin: {con_fecha}).{' [dry-run]' if args.dry_run else ''}"
    )
    return 0


def _update(conn, id_: str, plazo_texto: str, fecha_fin: str | None) -> None:
    with conn.cursor() as cur:
        cur.execute(UPDATE_SQL, {"id": id_, "plazo_texto": plazo_texto, "fecha_fin": fecha_fin})


if __name__ == "__main__":
    sys.exit(main())
