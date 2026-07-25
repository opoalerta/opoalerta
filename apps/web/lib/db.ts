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
  ultima_ejecucion: string | null;
  estado: string | null;
  ultimas_nuevas: number | null;
};

/**
 * Cliente Neon (driver HTTP, apto para funciones serverless).
 * Devuelve null si no hay DATABASE_URL, para que build y previews no rompan.
 */
function client() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  // Sin caché: el driver de Neon usa fetch(), que Next puede cachear en la Data
  // Cache y servir resultados obsoletos (p. ej. una ficha pedida antes de existir
  // la convocatoria seguiría dando 404 tras ingerirla). Los datos son dinámicos.
  return neon(url, { fetchOptions: { cache: "no-store" } });
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
             MAX(c.fecha_ingesta)::text AS ultima_ingesta,
             r.iniciada_en::text AS ultima_ejecucion,
             r.estado AS estado,
             r.convocatorias_nuevas AS ultimas_nuevas
      FROM fuentes f
      LEFT JOIN convocatorias c ON c.fuente_codigo = f.codigo
      LEFT JOIN LATERAL (
        SELECT iniciada_en, estado, convocatorias_nuevas
        FROM ingest_runs ir
        WHERE ir.fuente_codigo = f.codigo
        ORDER BY ir.iniciada_en DESC
        LIMIT 1
      ) r ON true
      GROUP BY f.codigo, f.nombre, r.iniciada_en, r.estado, r.convocatorias_nuevas
      ORDER BY f.codigo
    `;
    return rows as EstadoFuente[];
  } catch (err) {
    console.error("getEstado:", err);
    return [];
  }
}

export async function getConvocatoriaById(id: string): Promise<Convocatoria | null> {
  const sql = client();
  if (!sql) return null;
  // Next 16 puede entregar el param de ruta aún URL-codificado (p. ej. "boib%3A..."),
  // de forma inconsistente entre generateMetadata y el componente. Los ids nunca
  // llevan "%" literal, así que decodificar es seguro y normaliza ambos casos.
  let clave = id;
  try {
    const decoded = decodeURIComponent(id);
    if (decoded !== id) clave = decoded;
  } catch {
    // id malformado: se usa tal cual
  }
  try {
    const rows = await sql`
      SELECT id, titulo, organismo, ambito, ccaa,
             fecha_publicacion::text AS fecha_publicacion,
             fecha_fin_plazo::text AS fecha_fin_plazo,
             url_oficial, fuente_codigo
      FROM convocatorias
      WHERE id = ${clave}
      LIMIT 1
    `;
    return (rows[0] as Convocatoria | undefined) ?? null;
  } catch (err) {
    console.error("getConvocatoriaById:", err);
    return null;
  }
}

export async function getConvocatoriaIds(limit = 1000): Promise<string[]> {
  const sql = client();
  if (!sql) return [];
  try {
    const rows = await sql`
      SELECT id
      FROM convocatorias
      ORDER BY fecha_publicacion DESC, fecha_ingesta DESC
      LIMIT ${limit}
    `;
    return rows.map((r) => (r as { id: string }).id);
  } catch (err) {
    console.error("getConvocatoriaIds:", err);
    return [];
  }
}
