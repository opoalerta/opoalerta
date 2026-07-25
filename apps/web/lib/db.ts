import { neon } from "@neondatabase/serverless";

export type Convocatoria = {
  id: string;
  titulo: string;
  organismo: string;
  ambito: string;
  ccaa: string | null;
  fecha_publicacion: string;
  fecha_fin_plazo: string | null;
  url_oficial: string;
  fuente_codigo: string;
};

export type EstadoFuente = {
  fuente_codigo: string;
  nombre: string;
  total: number;
  ultima_ingesta: string | null;
};

/**
 * Cliente Neon (driver HTTP, apto para funciones serverless).
 * Devuelve null si no hay DATABASE_URL, para que build y previews no rompan.
 */
function client() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

export async function getConvocatorias(limit = 30): Promise<Convocatoria[]> {
  const sql = client();
  if (!sql) return [];
  try {
    const rows = await sql`
      SELECT id, titulo, organismo, ambito, ccaa,
             fecha_publicacion::text AS fecha_publicacion,
             fecha_fin_plazo::text AS fecha_fin_plazo,
             url_oficial, fuente_codigo
      FROM convocatorias
      ORDER BY fecha_publicacion DESC, fecha_ingesta DESC
      LIMIT ${limit}
    `;
    return rows as Convocatoria[];
  } catch (err) {
    console.error("getConvocatorias:", err);
    return [];
  }
}

export async function getEstado(): Promise<EstadoFuente[]> {
  const sql = client();
  if (!sql) return [];
  try {
    const rows = await sql`
      SELECT f.codigo AS fuente_codigo,
             f.nombre,
             COUNT(c.id)::int AS total,
             MAX(c.fecha_ingesta)::text AS ultima_ingesta
      FROM fuentes f
      LEFT JOIN convocatorias c ON c.fuente_codigo = f.codigo
      GROUP BY f.codigo, f.nombre
      ORDER BY f.codigo
    `;
    return rows as EstadoFuente[];
  } catch (err) {
    console.error("getEstado:", err);
    return [];
  }
}
