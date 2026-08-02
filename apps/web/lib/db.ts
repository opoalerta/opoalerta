import { neon } from "@neondatabase/serverless";

export type Convocatoria = {
  id: string;
  titulo: string;
  organismo: string;
  ambito: string;
  ccaa: string | null;
  fecha_publicacion: string;
  fecha_fin_plazo: string | null;
  fecha_fin_aprox: boolean;
  plazo_texto: string | null;
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

// Una convocatoria sigue "viva" en la web mientras no se sepa que su plazo
// venció. Regla (idéntica en el WHERE de abajo):
//   - Con fecha_fin_plazo y ya pasada        -> fuera (plazo agotado).
//   - Con fecha_fin_plazo futura             -> se mantiene.
//   - Sin fecha_fin_plazo (la mayoría, aún   -> se mantiene hasta 1 año desde
//     no la extraen los scrapers)               su publicación y luego cae sola.
//   - Ámbito europeo (EPSO): su fecha de     -> exento de la ventana; se mantiene
//     publicación es artificial (01-01)         mientras el proceso siga en curso.
// Así las convocatorias no desaparecen al llegar otras nuevas: solo se van al
// vencer el plazo (o al cumplir el año estimado si no consta plazo).
export type Pagina = {
  items: Convocatoria[];
  total: number;
};

export type Filtros = {
  q?: string;
  fuente?: string;
  ambito?: string;
  desde?: number;
  cuantas?: number;
};

/** Tamaño de página por defecto: lo que entra en pantalla sin scroll infinito. */
export const POR_PAGINA = 24;



/**
 * Busca convocatorias con los filtros aplicados **en Postgres**, y devuelve
 * además el total real que cumple esos filtros.
 *
 * El listado se filtraba en el navegador, así que había que mandarle todas las
 * convocatorias y un `LIMIT 500` evitaba que la página creciera sin control.
 * Ese tope de rendimiento se convirtió en un límite de producto: con 797 filas
 * la web decía «500 resultados» como si fueran todas, y como el orden es por
 * fecha descendente, lo que se perdía eran las más antiguas — justo las que
 * llevan más tiempo con el plazo abierto.
 *
 * Filtrando aquí, la página manda una veintena de tarjetas y la búsqueda ve la
 * tabla entera. `total` es el recuento de verdad, no el número de filas
 * devueltas, para que la interfaz nunca vuelva a confundir una cosa con otra.
 */
export async function buscarConvocatorias(filtros: Filtros = {}): Promise<Pagina> {
  const sql = client();
  if (!sql) return { items: [], total: 0 };

  const q = (filtros.q ?? "").trim();
  const fuente = (filtros.fuente ?? "").trim();
  const ambito = (filtros.ambito ?? "").trim();
  const desde = Math.max(0, filtros.desde ?? 0);
  const cuantas = Math.min(Math.max(1, filtros.cuantas ?? POR_PAGINA), 200);

  // Las cadenas vacías desactivan su filtro, así no hay que componer SQL.
  const patron = q ? `%${q}%` : "";

  // La comparación va sin tildes por los dos lados, igual que hacía el cliente
  // al normalizar en NFD: buscar «oposicion» tiene que seguir encontrando
  // «oposición». Se usa `translate`, que es built-in, y no la extensión
  // `unaccent`: esa necesitaría una migración, y si el código llegara a
  // producción antes que ella la consulta fallaría y la web se quedaría sin
  // convocatorias.

  try {
    const [items, conteo] = await Promise.all([
      sql`
        SELECT id, titulo, organismo, ambito, ccaa,
               fecha_publicacion::text AS fecha_publicacion,
               fecha_fin_plazo::text AS fecha_fin_plazo, fecha_fin_aprox, plazo_texto,
               url_oficial, fuente_codigo
        FROM convocatorias
        WHERE (fecha_fin_plazo IS NULL OR fecha_fin_plazo >= CURRENT_DATE - (CASE WHEN fecha_fin_aprox THEN INTERVAL '4 days' ELSE INTERVAL '0 days' END))
          AND (
            fecha_fin_plazo IS NOT NULL
            OR ambito = 'europeo'
            OR fecha_publicacion >= CURRENT_DATE - INTERVAL '1 year'
          )
          AND (${fuente} = '' OR fuente_codigo = ${fuente})
          AND (${ambito} = '' OR ambito = ${ambito})
          AND (
            ${patron} = ''
            OR translate(lower(titulo), 'áéíóúüñàèìòùâêîôûãõç', 'aeiouunaeiouaeiouaoc') LIKE translate(lower(${patron}), 'áéíóúüñàèìòùâêîôûãõç', 'aeiouunaeiouaeiouaoc')
            OR translate(lower(organismo), 'áéíóúüñàèìòùâêîôûãõç', 'aeiouunaeiouaeiouaoc') LIKE translate(lower(${patron}), 'áéíóúüñàèìòùâêîôûãõç', 'aeiouunaeiouaeiouaoc')
            OR lower(fuente_codigo) LIKE lower(${patron})
          )
        ORDER BY fecha_publicacion DESC, fecha_ingesta DESC
        LIMIT ${cuantas} OFFSET ${desde}
      `,
      sql`
        SELECT count(*)::int AS total
        FROM convocatorias
        WHERE (fecha_fin_plazo IS NULL OR fecha_fin_plazo >= CURRENT_DATE - (CASE WHEN fecha_fin_aprox THEN INTERVAL '4 days' ELSE INTERVAL '0 days' END))
          AND (
            fecha_fin_plazo IS NOT NULL
            OR ambito = 'europeo'
            OR fecha_publicacion >= CURRENT_DATE - INTERVAL '1 year'
          )
          AND (${fuente} = '' OR fuente_codigo = ${fuente})
          AND (${ambito} = '' OR ambito = ${ambito})
          AND (
            ${patron} = ''
            OR translate(lower(titulo), 'áéíóúüñàèìòùâêîôûãõç', 'aeiouunaeiouaeiouaoc') LIKE translate(lower(${patron}), 'áéíóúüñàèìòùâêîôûãõç', 'aeiouunaeiouaeiouaoc')
            OR translate(lower(organismo), 'áéíóúüñàèìòùâêîôûãõç', 'aeiouunaeiouaeiouaoc') LIKE translate(lower(${patron}), 'áéíóúüñàèìòùâêîôûãõç', 'aeiouunaeiouaeiouaoc')
            OR lower(fuente_codigo) LIKE lower(${patron})
          )
      `,
    ]);

    return {
      items: items as Convocatoria[],
      total: (conteo as { total: number }[])[0]?.total ?? 0,
    };
  } catch (err) {
    console.error("buscarConvocatorias:", err);
    return { items: [], total: 0 };
  }
}

/**
 * Valores distintos de fuente y ámbito, para poblar los filtros.
 *
 * Antes salían de las 500 convocatorias que se mandaban al cliente, así que una
 * fuente cuyas convocatorias quedaran fuera del corte desaparecía del
 * desplegable. Ahora se preguntan a la tabla.
 */
export async function getFacetas(): Promise<{ fuentes: string[]; ambitos: string[] }> {
  const sql = client();
  if (!sql) return { fuentes: [], ambitos: [] };
  try {
    const [f, a] = await Promise.all([
      sql`SELECT DISTINCT fuente_codigo AS v FROM convocatorias ORDER BY v`,
      sql`SELECT DISTINCT ambito AS v FROM convocatorias ORDER BY v`,
    ]);
    return {
      fuentes: (f as { v: string }[]).map((r) => r.v),
      ambitos: (a as { v: string }[]).map((r) => r.v),
    };
  } catch (err) {
    console.error("getFacetas:", err);
    return { fuentes: [], ambitos: [] };
  }
}

/**
 * Listado plano y acotado. El límite es obligatorio a propósito: el valor por
 * defecto era 500 y ese número, heredado sin pensarlo, es el que acabó
 * decidiendo cuántas convocatorias veía el usuario. Quien llame que diga cuántas
 * quiere y por qué. Para listar de verdad está `buscarConvocatorias`, que
 * pagina y devuelve el total real.
 */
export async function getConvocatorias(limit: number): Promise<Convocatoria[]> {
  const sql = client();
  if (!sql) return [];
  try {
    const rows = await sql`
      SELECT id, titulo, organismo, ambito, ccaa,
             fecha_publicacion::text AS fecha_publicacion,
             fecha_fin_plazo::text AS fecha_fin_plazo, fecha_fin_aprox, plazo_texto,
             url_oficial, fuente_codigo
      FROM convocatorias
      WHERE (fecha_fin_plazo IS NULL OR fecha_fin_plazo >= CURRENT_DATE - (CASE WHEN fecha_fin_aprox THEN INTERVAL '4 days' ELSE INTERVAL '0 days' END))
        AND (
          fecha_fin_plazo IS NOT NULL
          OR ambito = 'europeo'
          OR fecha_publicacion >= CURRENT_DATE - INTERVAL '1 year'
        )
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

export async function getConvocatoriasEuropeas(limit = 9): Promise<Convocatoria[]> {
  const sql = client();
  if (!sql) return [];
  try {
    const rows = await sql`
      SELECT id, titulo, organismo, ambito, ccaa,
             fecha_publicacion::text AS fecha_publicacion,
             fecha_fin_plazo::text AS fecha_fin_plazo, fecha_fin_aprox, plazo_texto,
             url_oficial, fuente_codigo
      FROM convocatorias
      WHERE ambito = 'europeo'
        AND (fecha_fin_plazo IS NULL OR fecha_fin_plazo >= CURRENT_DATE - (CASE WHEN fecha_fin_aprox THEN INTERVAL '4 days' ELSE INTERVAL '0 days' END))
      ORDER BY fecha_ingesta DESC
      LIMIT ${limit}
    `;
    return rows as Convocatoria[];
  } catch (err) {
    console.error("getConvocatoriasEuropeas:", err);
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
             fecha_fin_plazo::text AS fecha_fin_plazo, fecha_fin_aprox, plazo_texto,
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

/**
 * Ids para el sitemap. Van **todas**, también las de plazo cerrado: su página
 * de detalle sigue existiendo (`getConvocatoriaById` no filtra por plazo) y es
 * lo que encuentra quien busca en Google una convocatoria concreta meses
 * después.
 *
 * El tope por defecto es el del propio protocolo de sitemaps —50.000 URLs por
 * fichero—, no una cifra elegida a ojo. El anterior era 1.000, y la llamada del
 * sitemap pasaba 500: con 797 filas en la tabla, Google veía 500 y las otras
 * 297 no existían para el buscador. Si algún día se rebasan las 50.000 hará
 * falta un índice de sitemaps, y entonces esto tendrá que partirse en varios.
 */
export async function getConvocatoriaIds(limit = 50_000): Promise<string[]> {
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
