"""Envío diario de alertas por email.

Tras la ingesta, cruza las convocatorias nuevas (últimas ~25 h) con las
suscripciones confirmadas y envía a cada persona las que coinciden con sus
filtros guardados. Idempotente por `ultima_notificada` (no reenvía el mismo día).

Requiere en el entorno:
  - DATABASE_URL     acceso a Postgres (Neon).
  - RESEND_API_KEY   para enviar por Resend.
  - ALERTAS_FROM     remitente (por defecto onboarding@resend.dev).
  - SITE_URL         base para el enlace de baja.

Uso:
    python -m notificar --dry-run   # muestra a quién y qué enviaría, sin enviar
    python -m notificar             # envía de verdad
"""

from __future__ import annotations

import argparse
import os
import sys
import unicodedata
from typing import Any

import httpx

RESEND_ENDPOINT = "https://api.resend.com/emails"
FROM = os.environ.get("ALERTAS_FROM", "OpoAlerta <onboarding@resend.dev>")
SITE_URL = os.environ.get("SITE_URL", "https://opoalerta.es")
VENTANA_HORAS = 25


def _norm(s: str) -> str:
    s = unicodedata.normalize("NFD", s.lower())
    return "".join(c for c in s if unicodedata.category(c) != "Mn")


def coincide(conv: dict[str, Any], susc: dict[str, Any]) -> bool:
    """¿La convocatoria encaja con los filtros guardados de la suscripción?"""
    if susc.get("fuente_codigo") and conv["fuente_codigo"] != susc["fuente_codigo"]:
        return False
    if susc.get("ambito") and conv["ambito"] != susc["ambito"]:
        return False
    if susc.get("ccaa") and conv["ccaa"] != susc["ccaa"]:
        return False
    q = susc.get("q")
    if q:
        heno = _norm(f"{conv['titulo']} {conv['organismo']}")
        if _norm(q) not in heno:
            return False
    return True


def _fila(c: dict[str, Any]) -> str:
    link_style = "color:#01689b;font-weight:600;text-decoration:none"
    meta = f"{c['organismo']} · {c['fuente_codigo'].upper()} · {c['fecha_publicacion']}"
    return (
        '<li style="margin-bottom:14px">'
        f'<a href="{c["url_oficial"]}" style="{link_style}">{c["titulo"]}</a>'
        f'<div style="color:#595959;font-size:13px">{meta}</div>'
        "</li>"
    )


def _render(convocatorias: list[dict[str, Any]], token: str) -> str:
    filas = "".join(_fila(c) for c in convocatorias)
    baja = f"{SITE_URL}/alertas/baja?token={token}"
    body_style = (
        "font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;"
        "max-width:600px;margin:0 auto;color:#1a1a1a"
    )
    return f"""
    <div style="{body_style}">
      <h1 style="color:#154273;font-size:20px">Nuevas convocatorias para ti</h1>
      <p>Estas convocatorias publicadas hoy coinciden con tu alerta:</p>
      <ul style="padding-left:18px">{filas}</ul>
      <hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0">
      <p style="color:#999;font-size:12px">
        OpoAlerta · datos oficiales, siempre con enlace y fecha ·
        <a href="{baja}" style="color:#01689b">darse de baja</a>
      </p>
    </div>"""


def _enviar(api_key: str, to: str, html: str, n: int) -> bool:
    asunto = f"{n} nueva{'s' if n != 1 else ''} convocatoria{'s' if n != 1 else ''} · OpoAlerta"
    resp = httpx.post(
        RESEND_ENDPOINT,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={"from": FROM, "to": to, "subject": asunto, "html": html},
        timeout=30,
    )
    if resp.status_code >= 300:
        print(f"  ERROR Resend {resp.status_code}: {resp.text[:200]}", file=sys.stderr)
        return False
    return True


def _fetch(conn) -> tuple[list[dict], list[dict]]:
    from datetime import UTC, datetime, timedelta

    from psycopg.rows import dict_row

    cutoff = datetime.now(UTC) - timedelta(hours=VENTANA_HORAS)
    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            """
            SELECT id, titulo, organismo, ambito, ccaa,
                   fecha_publicacion::text AS fecha_publicacion,
                   url_oficial, fuente_codigo, fecha_ingesta
            FROM convocatorias
            WHERE fecha_ingesta > %s
            """,
            (cutoff,),
        )
        nuevas = cur.fetchall()
        cur.execute(
            """
            SELECT id, email, q, ccaa, ambito, fuente_codigo, token, ultima_notificada
            FROM suscripciones
            WHERE confirmada = TRUE
              AND (ultima_notificada IS NULL OR ultima_notificada < now() - interval '12 hours')
            """
        )
        suscripciones = cur.fetchall()
    return nuevas, suscripciones


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Envío de alertas por email")
    parser.add_argument("--dry-run", action="store_true", help="No envía ni marca notificadas.")
    args = parser.parse_args(argv)

    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        print("Sin DATABASE_URL: nada que notificar.")
        return 0
    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key and not args.dry_run:
        print("Sin RESEND_API_KEY: no se puede enviar (usa --dry-run para simular).")
        return 0

    import psycopg

    enviados = 0
    with psycopg.connect(dsn) as conn:
        nuevas, suscripciones = _fetch(conn)
        print(f"{len(nuevas)} convocatorias nuevas, {len(suscripciones)} suscripciones activas.")
        for susc in suscripciones:
            matches = [c for c in nuevas if coincide(c, susc)]
            if not matches:
                continue
            print(f"  {susc['email']}: {len(matches)} convocatorias")
            if args.dry_run:
                continue
            html = _render(matches, susc["token"])
            if _enviar(api_key, susc["email"], html, len(matches)):
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE suscripciones SET ultima_notificada = now() WHERE id = %s",
                        (susc["id"],),
                    )
                conn.commit()
                enviados += 1

    print(f"Enviados: {enviados}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
