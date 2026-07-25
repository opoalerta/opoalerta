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
  return neon(url);
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
