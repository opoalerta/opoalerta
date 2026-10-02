"""Envío diario de alertas por email.

Tras la ingesta, cruza las convocatorias nuevas (últimas ~25 h) con las
suscripciones confirmadas y envía a cada persona las que coinciden con sus
filtros guardados. Idempotente por `ultima_notificada` (no reenvía el mismo día).

En el mismo mensaje va el aviso de cierre: las convocatorias de sus filtros
cuyo plazo de solicitud acaba en pocos días. Enterarse de una convocatoria
el día que sale sirve de poco si luego se pasa la fecha de presentar la
instancia. Cada aviso de cierre sale una sola vez por suscripción
(`recordatorios_plazo`), no una mañana tras otra.

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
# Días de antelación del aviso de cierre. Con plazo aproximado (contado en días
# hábiles solo con festivos nacionales, puede quedarse corto uno o dos días) se
# avisa antes, para que el error no se coma el margen.
AVISO_DIAS = 3
AVISO_DIAS_APROX = 5
# Una fecha de fin en una convocatoria de hace meses suele ser un plazo mal
# leído (otro plazo del texto, un año que no es), no una que siga abierta.
AVISO_MAX_ANTIGUEDAD_DIAS = 90
ZONA = "Europe/Madrid"
# Tope de avisos de cierre por mensaje. Un aviso así sirve si la lista es
# corta: una alerta sin filtros encajaba con 372 cierres en tres días
# (2026-10-02), y eso no avisa de nada.
AVISO_MAX = 10
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


def _hoy():
    from datetime import datetime
    from zoneinfo import ZoneInfo

    return datetime.now(ZoneInfo(ZONA)).date()


def _cuando_cierra(c: dict[str, Any], hoy=None) -> str:
    """«hoy», «mañana», «en 3 días», con la fecha y la marca de aproximada."""
    from datetime import date

    fin = date.fromisoformat(str(c["fecha_fin_plazo"])[:10])
    dias = (fin - (hoy or _hoy())).days
    rel = "hoy" if dias <= 0 else "mañana" if dias == 1 else f"en {dias} días"
    aprox = " (aprox.)" if c.get("fecha_fin_aprox") else ""
    return f"cierra {rel}, el {fin:%d/%m}{aprox}"


def _fila_cierre(c: dict[str, Any], hoy=None) -> str:
    link_style = "color:#01689b;font-weight:600;text-decoration:none"
    meta = f"{c['organismo']} · {c['fuente_codigo'].upper()}"
    return (
        '<li style="margin-bottom:14px">'
        f'<a href="{_safe_url(c["url_oficial"])}" style="{link_style}">{escape(c["titulo"])}</a>'
        f'<div style="color:#b42318;font-size:13px;font-weight:600">'
        f"{escape(_cuando_cierra(c, hoy).capitalize())}</div>"
        f'<div style="color:#595959;font-size:13px">{escape(meta)}</div>'
        "</li>"
    )


def _render(
    convocatorias: list[dict[str, Any]],
    token: str,
    cierres: list[dict[str, Any]] | None = None,
    hoy=None,
) -> str:
    cierres = cierres or []
    bloques = []
    if convocatorias:
        filas = "".join(_fila(c) for c in convocatorias)
        bloques.append(
            '<h1 style="color:#154273;font-size:20px">Nuevas convocatorias para ti</h1>'
            "<p>Estas convocatorias publicadas hoy coinciden con tu alerta:</p>"
            f'<ul style="padding-left:18px">{filas}</ul>'
        )
    if cierres:
        filas = "".join(_fila_cierre(c, hoy) for c in cierres)
        tam = 20 if not convocatorias else 17
        bloques.append(
            f'<h2 style="color:#b42318;font-size:{tam}px">El plazo cierra pronto</h2>'
            "<p>Si te interesan, aún estás a tiempo de presentar la solicitud:</p>"
            f'<ul style="padding-left:18px">{filas}</ul>'
        )
    baja = _safe_url(f"{SITE_URL}/alertas/baja?token={quote(token, safe='')}")
    body_style = (
        "font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;"
        "max-width:600px;margin:0 auto;color:#1a1a1a"
    )
    return f"""
    <div style="{body_style}">
      {"".join(bloques)}
      <hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0">
      <p style="color:#999;font-size:12px">
        OpoAlerta · datos oficiales, siempre con enlace y fecha ·
        <a href="{baja}" style="color:#01689b">darse de baja</a>
      </p>
    </div>"""


def _asunto(n: int, n_cierres: int = 0) -> str:
    cierran = f"{n_cierres} plazo{'s' if n_cierres != 1 else ''} a punto de cerrar"
    if not n:
        return f"{cierran} · OpoAlerta"
    nuevas = f"{n} nueva{'s' if n != 1 else ''} convocatoria{'s' if n != 1 else ''}"
    return f"{nuevas} y {cierran} · OpoAlerta" if n_cierres else f"{nuevas} · OpoAlerta"


def _enviar(api_key: str, to: str, html: str, n: int, n_cierres: int = 0) -> bool:
    asunto = _asunto(n, n_cierres)
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


def _render_telegram(
    convocatorias: list[dict[str, Any]],
    cierres: list[dict[str, Any]] | None = None,
    hoy=None,
) -> str:
    cierres = cierres or []
    lineas: list[str] = []
    n = len(convocatorias)
    if n:
        cabecera = f"{n} nueva{'s' if n != 1 else ''} convocatoria{'s' if n != 1 else ''}"
        lineas += [f"<b>{cabecera}</b>", ""]
        for c in convocatorias[:TELEGRAM_MAX_ITEMS]:
            titulo = _escape_html(_acorta(c["titulo"], TELEGRAM_TITULO_MAX))
            org = _escape_html(_acorta(c["organismo"], 60))
            lineas.append(f'• <a href="{_safe_url(c["url_oficial"])}">{titulo}</a>')
            lineas.append(f"  {org} · {_escape_html(c['fuente_codigo'].upper())}")
        if n > TELEGRAM_MAX_ITEMS:
            lineas.append(f"\n…y {n - TELEGRAM_MAX_ITEMS} más en {_escape_html(SITE_URL)}")
    if cierres:
        if lineas:
            lineas.append("")
        nc = len(cierres)
        lineas += [f"<b>⏳ {nc} plazo{'s' if nc != 1 else ''} a punto de cerrar</b>", ""]
        for c in cierres[:TELEGRAM_MAX_ITEMS]:
            titulo = _escape_html(_acorta(c["titulo"], TELEGRAM_TITULO_MAX))
            lineas.append(f'• <a href="{_safe_url(c["url_oficial"])}">{titulo}</a>')
            lineas.append(f"  {_escape_html(_cuando_cierra(c, hoy).capitalize())}")
        if nc > TELEGRAM_MAX_ITEMS:
            lineas.append(f"\n…y {nc - TELEGRAM_MAX_ITEMS} más en {_escape_html(SITE_URL)}")
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


def _fetch_cierres(conn) -> tuple[list[dict], set[tuple[str, str]]]:
    """Convocatorias cuyo plazo acaba en los próximos días y los avisos de
    cierre ya enviados de esas convocatorias, como pares (suscripción, conv.)."""
    from psycopg.errors import UndefinedTable
    from psycopg.rows import dict_row

    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            """
            SELECT id, titulo, organismo, ambito, ccaa,
                   fecha_publicacion::text AS fecha_publicacion,
                   fecha_fin_plazo::text AS fecha_fin_plazo, fecha_fin_aprox,
                   url_oficial, fuente_codigo
            FROM convocatorias
            WHERE fecha_fin_plazo IS NOT NULL
              AND fecha_fin_plazo >= %(hoy)s
              AND fecha_fin_plazo <= %(hoy)s + CASE WHEN fecha_fin_aprox
                                                    THEN %(aprox)s ELSE %(exacto)s END
              AND fecha_publicacion >= %(hoy)s - %(antiguedad)s
            ORDER BY fecha_fin_plazo, titulo
            """,
            {
                "hoy": _hoy(),
                "aprox": AVISO_DIAS_APROX,
                "exacto": AVISO_DIAS,
                "antiguedad": AVISO_MAX_ANTIGUEDAD_DIAS,
            },
        )
        cierres = cur.fetchall()
        avisados: set[tuple[str, str]] = set()
        if cierres:
            try:
                cur.execute(
                    """
                    SELECT suscripcion_id::text AS s, convocatoria_id AS c
                    FROM recordatorios_plazo
                    WHERE convocatoria_id = ANY(%s)
                    """,
                    ([c["id"] for c in cierres],),
                )
            except UndefinedTable:
                # Código desplegado antes de aplicar 008_recordatorios_plazo.sql
                # (db-migrate.yml es manual). Sin la tabla no se puede evitar
                # repetir avisos, así que no se manda ninguno; las alertas de
                # convocatorias nuevas siguen saliendo.
                conn.rollback()
                print("Sin tabla recordatorios_plazo: aplica la migración 008.", file=sys.stderr)
                return [], set()
            avisados = {(r["s"], r["c"]) for r in cur.fetchall()}
    return cierres, avisados


def cierres_para(
    susc: dict[str, Any],
    cierres: list[dict],
    avisados: set[tuple[str, str]],
    nuevas_ids: set[str],
) -> list[dict]:
    """Los cierres que tocan a esta suscripción: encajan con sus filtros, no se
    le han avisado ya y no van en el bloque de nuevas del mismo mensaje.
    `cierres` llega ordenado por fecha de fin."""
    sid = str(susc.get("id"))
    suyos = [
        c
        for c in cierres
        if c["id"] not in nuevas_ids and (sid, c["id"]) not in avisados and coincide(c, susc)
    ]
    # Sin texto de búsqueda (solo boletín o ámbito, o nada) la alerta es
    # general: si encaja con más del tope, no es un aviso sino un listado y se
    # omite. Con texto, se mandan los más próximos; el resto, al irse acercando
    # su fecha, entra otro día (solo se registran los enviados).
    if len(suyos) > AVISO_MAX and not (susc.get("q") or "").strip():
        return []
    return suyos[:AVISO_MAX]


def _notificar_una(
    susc: dict[str, Any], matches: list[dict], api_key, tg_token, cierres=None
) -> bool:
    """Envía por el canal de la suscripción. Devuelve True si se envió."""
    canal = susc.get("canal", "email")
    if canal == "telegram" and susc.get("telegram_chat_id"):
        if not tg_token:
            print("  (sin TELEGRAM_BOT_TOKEN, omito)", file=sys.stderr)
            return False
        return _enviar_telegram(
            tg_token, susc["telegram_chat_id"], _render_telegram(matches, cierres)
        )
    if canal == "email" and susc.get("email"):
        if not api_key:
            print("  (sin RESEND_API_KEY, omito)", file=sys.stderr)
            return False
        html = _render(matches, susc["token"], cierres)
        return _enviar(api_key, susc["email"], html, len(matches), len(cierres or []))
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
        cierres, avisados = _fetch_cierres(conn)
        print(
            f"{len(nuevas)} convocatorias nuevas, {len(cierres)} con plazo a punto de cerrar, "
            f"{len(suscripciones)} suscripciones activas."
        )
        for susc in suscripciones:
            matches = [c for c in nuevas if coincide(c, susc)]
            suyos = cierres_para(susc, cierres, avisados, {c.get("id") for c in matches})
            if not matches and not suyos:
                continue
            canal = "telegram" if susc.get("canal") == "telegram" else "email"
            print(f"  [{canal}] {len(matches)} convocatorias, {len(suyos)} cierres")
            if args.dry_run:
                continue
            if _notificar_una(susc, matches, api_key, tg_token, suyos):
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE suscripciones SET ultima_notificada = now() WHERE id = %s",
                        (susc["id"],),
                    )
                    for c in suyos:
                        cur.execute(
                            "INSERT INTO recordatorios_plazo (suscripcion_id, convocatoria_id)"
                            " VALUES (%s, %s) ON CONFLICT DO NOTHING",
                            (susc["id"], c["id"]),
                        )
                conn.commit()
                enviados += 1

    print(f"Enviados: {enviados}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
