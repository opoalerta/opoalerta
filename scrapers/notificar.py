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
    python -m notificar --dry-run   # muestra recuentos por canal, sin enviar
    python -m notificar             # envía de verdad
"""

from __future__ import annotations

import argparse
import os
import sys
import unicodedata
from html import escape
from typing import Any
from urllib.parse import quote, urlsplit

import httpx

RESEND_ENDPOINT = "https://api.resend.com/emails"
# `or` en vez de default: una variable de entorno vacía ("") no debe ganar al valor por defecto.
FROM = os.environ.get("ALERTAS_FROM") or "OpoAlerta <onboarding@resend.dev>"
SITE_URL = os.environ.get("SITE_URL") or "https://opoalerta.es"
VENTANA_HORAS = 25
TELEGRAM_MAX_ITEMS = 10
TELEGRAM_TITULO_MAX = 130


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
        f'<a href="{_safe_url(c["url_oficial"])}" style="{link_style}">{escape(c["titulo"])}</a>'
        f'<div style="color:#595959;font-size:13px">{escape(meta)}</div>'
        "</li>"
    )


def _render(convocatorias: list[dict[str, Any]], token: str) -> str:
    filas = "".join(_fila(c) for c in convocatorias)
    baja = _safe_url(f"{SITE_URL}/alertas/baja?token={quote(token, safe='')}")
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
    try:
        resp = httpx.post(
            RESEND_ENDPOINT,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"from": FROM, "to": to, "subject": asunto, "html": html},
            timeout=30,
        )
    except httpx.HTTPError:
        print("  ERROR Resend: fallo de transporte", file=sys.stderr)
        return False
    if resp.status_code >= 300:
        print(f"  ERROR Resend {resp.status_code}", file=sys.stderr)
        return False
    return True


def _escape_html(s: str) -> str:
    return escape(s, quote=True)


def _safe_url(value: str) -> str:
    """Allow web links only; escape separately for their HTML attribute context."""
    try:
        parts = urlsplit(value)
        if (
            parts.scheme in {"https", "http"}
            and parts.hostname
            and not parts.username
            and not parts.password
            and not any(ord(c) < 33 or ord(c) == 127 for c in value)
            and "\\" not in value
        ):
            return escape(value, quote=True)
    except ValueError:
        pass
    return "https://opoalerta.es"


def _acorta(s: str, n: int) -> str:
    return s if len(s) <= n else s[: n - 1].rstrip() + "…"


def _render_telegram(convocatorias: list[dict[str, Any]]) -> str:
    n = len(convocatorias)
    lineas = [f"<b>{n} nueva{'s' if n != 1 else ''} convocatoria{'s' if n != 1 else ''}</b>", ""]
    for c in convocatorias[:TELEGRAM_MAX_ITEMS]:
        titulo = _escape_html(_acorta(c["titulo"], TELEGRAM_TITULO_MAX))
        org = _escape_html(_acorta(c["organismo"], 60))
        lineas.append(f'• <a href="{_safe_url(c["url_oficial"])}">{titulo}</a>')
        lineas.append(f"  {org} · {_escape_html(c['fuente_codigo'].upper())}")
    if n > TELEGRAM_MAX_ITEMS:
        lineas.append(f"\n…y {n - TELEGRAM_MAX_ITEMS} más en {_escape_html(SITE_URL)}")
    lineas.append("\nPara darte de baja: /stop")
    return "\n".join(lineas)


def _enviar_telegram(bot_token: str, chat_id: int, text: str) -> bool:
    try:
        resp = httpx.post(
            f"https://api.telegram.org/bot{bot_token}/sendMessage",
            json={
                "chat_id": chat_id,
                "text": text,
                "parse_mode": "HTML",
                "disable_web_page_preview": True,
            },
            timeout=30,
        )
    except httpx.HTTPError:
        print("  ERROR Telegram: fallo de transporte", file=sys.stderr)
        return False
    if resp.status_code >= 300:
        print(f"  ERROR Telegram {resp.status_code}", file=sys.stderr)
        return False
    try:
        result = resp.json()
    except ValueError:
        result = None
    if not isinstance(result, dict) or result.get("ok") is not True:
        print("  ERROR Telegram: respuesta no aceptada", file=sys.stderr)
        return False
    return True


def _fetch(conn, force: bool = False) -> tuple[list[dict], list[dict]]:
    from datetime import UTC, datetime, timedelta

    from psycopg.rows import dict_row

    cutoff = datetime.now(UTC) - timedelta(hours=VENTANA_HORAS)
    # Con --force se ignora el guard de 12h (envío manual).
    guard = (
        ""
        if force
        else "AND (ultima_notificada IS NULL OR ultima_notificada < now() - interval '12 hours')"
    )
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
            f"""
            SELECT id, email, canal, telegram_chat_id, q, ccaa, ambito,
                   fuente_codigo, token, ultima_notificada
            FROM suscripciones
            WHERE confirmada = TRUE
              {guard}
            """
        )
        suscripciones = cur.fetchall()
    return nuevas, suscripciones


def _notificar_una(susc: dict[str, Any], matches: list[dict], api_key, tg_token) -> bool:
    """Envía por el canal de la suscripción. Devuelve True si se envió."""
    canal = susc.get("canal", "email")
    if canal == "telegram" and susc.get("telegram_chat_id"):
        if not tg_token:
            print("  (sin TELEGRAM_BOT_TOKEN, omito)", file=sys.stderr)
            return False
        return _enviar_telegram(tg_token, susc["telegram_chat_id"], _render_telegram(matches))
    if canal == "email" and susc.get("email"):
        if not api_key:
            print("  (sin RESEND_API_KEY, omito)", file=sys.stderr)
            return False
        return _enviar(api_key, susc["email"], _render(matches, susc["token"]), len(matches))
    return False


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Envío de alertas (email y Telegram)")
    parser.add_argument("--dry-run", action="store_true", help="No envía ni marca notificadas.")
    parser.add_argument(
        "--force", action="store_true", help="Ignora el guard de 12h (envío manual)."
    )
    args = parser.parse_args(argv)

    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        print("Sin DATABASE_URL: nada que notificar.")
        return 0
    api_key = os.environ.get("RESEND_API_KEY")
    tg_token = os.environ.get("TELEGRAM_BOT_TOKEN")

    import psycopg

    enviados = 0
    with psycopg.connect(dsn) as conn:
        nuevas, suscripciones = _fetch(conn, force=args.force)
        print(f"{len(nuevas)} convocatorias nuevas, {len(suscripciones)} suscripciones activas.")
        for susc in suscripciones:
            matches = [c for c in nuevas if coincide(c, susc)]
            if not matches:
                continue
            canal = "telegram" if susc.get("canal") == "telegram" else "email"
            print(f"  [{canal}] {len(matches)} convocatorias")
            if args.dry_run:
                continue
            if _notificar_una(susc, matches, api_key, tg_token):
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
