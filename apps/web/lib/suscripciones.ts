import { neon } from "@neondatabase/serverless";
import { randomUUID } from "crypto";

export type FiltrosSuscripcion = {
  q: string | null;
  ccaa: string | null;
  ambito: string | null;
  fuente_codigo: string | null;
};

function client() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url, { fetchOptions: { cache: "no-store" } });
}

function limpiar(v: string | null | undefined): string | null {
  const s = (v ?? "").trim();
  return s.length ? s : null;
}

/**
 * Crea (o reactiva) una suscripción sin confirmar y devuelve su token.
 * Si ya existía la misma búsqueda para ese email, reemiten un token nuevo y
 * la vuelven a dejar sin confirmar (para reenviar la confirmación).
 */
export async function crearSuscripcion(
  email: string,
  filtros: FiltrosSuscripcion
): Promise<{ token: string } | null> {
  const sql = client();
  if (!sql) return null;
  const token = randomUUID();
  const rows = await sql`
    INSERT INTO suscripciones (email, q, ccaa, ambito, fuente_codigo, token)
    VALUES (
      ${email.toLowerCase()},
      ${limpiar(filtros.q)}, ${limpiar(filtros.ccaa)},
      ${limpiar(filtros.ambito)}, ${limpiar(filtros.fuente_codigo)},
      ${token}
    )
    ON CONFLICT (email, q, ccaa, ambito, fuente_codigo) DO UPDATE
      SET token = EXCLUDED.token, confirmada = FALSE, confirmada_en = NULL
    RETURNING token
  `;
  return { token: (rows[0] as { token: string }).token };
}

export async function confirmarSuscripcion(token: string): Promise<boolean> {
  const sql = client();
  if (!sql) return false;
  const rows = await sql`
    UPDATE suscripciones
    SET confirmada = TRUE, confirmada_en = now()
    WHERE token = ${token}
    RETURNING id
  `;
  return rows.length > 0;
}

export async function bajaSuscripcion(token: string): Promise<boolean> {
  const sql = client();
  if (!sql) return false;
  const rows = await sql`
    DELETE FROM suscripciones WHERE token = ${token} RETURNING id
  `;
  return rows.length > 0;
}

/**
 * Crea una suscripción de Telegram pendiente (sin chat_id) y devuelve su token.
 * El webhook la vincula al chat cuando la persona pulsa Start en el bot.
 */
export async function crearSuscripcionTelegram(
  filtros: FiltrosSuscripcion
): Promise<{ token: string } | null> {
  const sql = client();
  if (!sql) return null;
  const token = randomUUID();
  await sql`
    INSERT INTO suscripciones (canal, q, ccaa, ambito, fuente_codigo, token)
    VALUES (
      'telegram',
      ${limpiar(filtros.q)}, ${limpiar(filtros.ccaa)},
      ${limpiar(filtros.ambito)}, ${limpiar(filtros.fuente_codigo)},
      ${token}
    )
  `;
  return { token };
}

/**
 * Vincula una suscripción de Telegram (por token) a un chat y la confirma.
 * La invoca el webhook al recibir "/start <token>".
 */
export async function vincularTelegram(
  token: string,
  chatId: number
): Promise<FiltrosSuscripcion | null> {
  const sql = client();
  if (!sql) return null;
  const rows = await sql`
    UPDATE suscripciones
    SET telegram_chat_id = ${chatId}, confirmada = TRUE, confirmada_en = now()
    WHERE token = ${token} AND canal = 'telegram'
    RETURNING q, ccaa, ambito, fuente_codigo
  `;
  if (rows.length === 0) return null;
  const r = rows[0] as FiltrosSuscripcion;
  return { q: r.q, ccaa: r.ccaa, ambito: r.ambito, fuente_codigo: r.fuente_codigo };
}

/** Resumen legible de los filtros guardados, para mensajes al usuario. */
export function resumenFiltros(f: FiltrosSuscripcion): string {
  const partes = [
    f.q && `“${f.q}”`,
    f.fuente_codigo && f.fuente_codigo.toUpperCase(),
    f.ambito,
    f.ccaa,
  ].filter(Boolean);
  return partes.length ? partes.join(", ") : "todas las convocatorias";
}

/** Baja de todas las suscripciones de un chat de Telegram (comando /stop). */
export async function bajaTelegram(chatId: number): Promise<number> {
  const sql = client();
  if (!sql) return 0;
  const rows = await sql`
    DELETE FROM suscripciones WHERE telegram_chat_id = ${chatId} RETURNING id
  `;
  return rows.length;
}
