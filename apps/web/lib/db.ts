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

/**
 * Lo que devuelve la ficha de detalle: la convocatoria más los campos que solo
 * ella necesita. Los listados no los seleccionan (son columnas anchas y no se
 * pintan en las tarjetas), así que van en un tipo aparte en vez de opcionales
 * en `Convocatoria`: aquí siempre vienen.
 */
export type ConvocatoriaDetalle = Convocatoria & {
  cuerpo: string | null;
  grupo: string | null;
  titulacion_requerida: string | null;
  num_plazas: number | null;
  tipo_acceso: string | null;
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

/**
 * Igual que `client()`, pero dejando que Next cachee el fetch.
 *
 * Solo para la ficha de convocatoria, que es contenido de archivo: una vez
 * publicada en el boletín no cambia. `no-store` la obligaba a ser dinámica, y
 * con ~1.400 fichas que Google tiene que rastrear eso significaba una consulta
 * a Postgres y un `cache-control: no-store` por cada visita del robot. La
 * página declara su propio `revalidate`, que es quien manda sobre la frescura
 * —incluida la de un 404 servido antes de que la ingesta trajera la ficha.
 */
function clientCacheable() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

/**
 * Un fallo de consulta no es una lista vacía.
 *
 * Todas las funciones de aquí capturaban el error y devolvían `[]`. Una página
 * que declara `revalidate` no tiene forma de distinguir eso de «no hay nada que
 * mostrar»: Next da la regeneración por buena y **cachea la página vacía**.
 *
 * Es lo que pasó el 24/08/2026. Neon empezó a responder 402 («exceeded the
 * compute time quota») a las 20:07; la portada se regeneró a las 20:42, en
 * mitad del corte, y se quedó anunciando «0 convocatorias» durante diecinueve
 * horas —con la base ya restablecida y 2.646 convocatorias vivas detrás—,
 * porque su copia congelada seguía siendo, para Next, un resultado legítimo.
 * El archivo se salvó de casualidad: su prerender era del build de las 09:24,
 * anterior al corte, y al fallar sus revalidaciones Next siguió sirviéndolo.
 *
 * Propagando el error se obtiene ese mismo comportamiento a propósito: la
 * regeneración falla y se sigue sirviendo la última copia buena, que es lo que
 * se quiere de un corte pasajero. `never` deja que el `catch` compile sin
 * inventarse un valor de retorno.
 */
function fallo(donde: string, err: unknown): never {
  console.error(`${donde}:`, err);
  throw err;
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

export type Orden = "recientes" | "urgencia";

export type Filtros = {
  q?: string;
  fuente?: string;
  ambito?: string;
  ccaa?: string;
  orden?: Orden;
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
export async function buscarConvocatorias(
  filtros: Filtros = {},
  { cacheable = false }: { cacheable?: boolean } = {},
): Promise<Pagina> {
  // La portada pide la primera tanda sin filtros y declara `revalidate`; con
  // `no-store` ese fetch la volvía dinámica y el `revalidate` no se aplicaba
  // nunca. /api/convocatorias sí depende de los searchParams de cada petición,
  // así que sigue leyendo sin caché.
  const sql = cacheable ? clientCacheable() : client();
  if (!sql) return { items: [], total: 0 };

  const q = (filtros.q ?? "").trim();
  const fuente = (filtros.fuente ?? "").trim();
  const ambito = (filtros.ambito ?? "").trim();
  const ccaa = (filtros.ccaa ?? "").trim();
  const orden: Orden = filtros.orden === "urgencia" ? "urgencia" : "recientes";
  const desde = Math.max(0, filtros.desde ?? 0);
  const cuantas = Math.min(Math.max(1, filtros.cuantas ?? POR_PAGINA), 200);

  // Las cadenas vacías desactivan su filtro, así no hay que componer SQL.
  const patron = q ? `%${q}%` : "";

  const orderBy =
    orden === "urgencia"
      ? sql.unsafe("fecha_fin_plazo ASC NULLS LAST, fecha_publicacion DESC")
      : sql.unsafe("fecha_publicacion DESC, fecha_ingesta DESC, id DESC");

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
          AND (${ccaa} = '' OR ccaa = ${ccaa})
          AND (
            ${patron} = ''
            OR translate(lower(titulo), 'áéíóúüñàèìòùâêîôûãõç', 'aeiouunaeiouaeiouaoc') LIKE translate(lower(${patron}), 'áéíóúüñàèìòùâêîôûãõç', 'aeiouunaeiouaeiouaoc')
            OR translate(lower(organismo), 'áéíóúüñàèìòùâêîôûãõç', 'aeiouunaeiouaeiouaoc') LIKE translate(lower(${patron}), 'áéíóúüñàèìòùâêîôûãõç', 'aeiouunaeiouaeiouaoc')
            OR lower(fuente_codigo) LIKE lower(${patron})
          )
        ORDER BY ${orderBy}
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
          AND (${ccaa} = '' OR ccaa = ${ccaa})
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
    fallo("buscarConvocatorias", err);
  }
}

/**
 * Valores distintos de fuente y ámbito, para poblar los filtros.
 *
 * Antes salían de las 500 convocatorias que se mandaban al cliente, así que una
 * fuente cuyas convocatorias quedaran fuera del corte desaparecía del
 * desplegable. Ahora se preguntan a la tabla.
 */
export async function getFacetas(): Promise<{ fuentes: string[]; ambitos: string[]; ccaas: string[] }> {
  // Solo la usa la portada, que declara `revalidate`.
  const sql = clientCacheable();
  if (!sql) return { fuentes: [], ambitos: [], ccaas: [] };
  try {
    const [f, a, c] = await Promise.all([
      sql`SELECT DISTINCT fuente_codigo AS v FROM convocatorias ORDER BY v`,
      sql`SELECT DISTINCT ambito AS v FROM convocatorias ORDER BY v`,
      sql`SELECT DISTINCT ccaa AS v FROM convocatorias WHERE ccaa IS NOT NULL ORDER BY v`,
    ]);
    return {
      fuentes: (f as { v: string }[]).map((r) => r.v),
      ambitos: (a as { v: string }[]).map((r) => r.v),
      ccaas: (c as { v: string }[]).map((r) => r.v),
    };
  } catch (err) {
    fallo("getFacetas", err);
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
  // Solo la usa /rss.xml, que declara `revalidate`.
  const sql = clientCacheable();
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
    fallo("getConvocatorias", err);
  }
}

/**
 * El estado de cada fuente. Hay dos puertas porque el layout entero depende de
 * cuál se use.
 *
 * `getEstado` la llama el Footer, que vive en el layout raíz y por tanto se
 * renderiza en **todas** las páginas. Mientras leía con `no-store`, ese único
 * fetch marcaba como dinámico el árbol completo: daba igual el `revalidate` de
 * cada página, en producción ni siquiera los artículos del blog —markdown puro,
 * prerenderizados con `generateStaticParams`— llegaban cacheados. Vercel
 * respondía `no-store` y `x-vercel-cache: MISS` en todo el sitio.
 *
 * En el build no se notaba: sin `DATABASE_URL`, `client()` devuelve null, no
 * hay fetch y Next prerenderiza tan contento. El síntoma solo aparecía con la
 * base conectada.
 *
 * Lo que el Footer saca de aquí es la etiqueta de fase del proyecto, que puede
 * ir con una hora de retraso sin que pase nada. Quien necesita el dato al
 * segundo es /estado, y para eso está `getEstadoEnVivo`.
 */
type ClienteNeon = NonNullable<ReturnType<typeof client>>;

export async function getEstado(): Promise<EstadoFuente[]> {
  const sql = clientCacheable();
  if (!sql) return [];
  return consultarEstado(sql);
}

/** Lectura sin caché, para el panel de estado del servicio. */
export async function getEstadoEnVivo(): Promise<EstadoFuente[]> {
  const sql = client();
  if (!sql) return [];
  return consultarEstado(sql);
}

async function consultarEstado(sql: ClienteNeon): Promise<EstadoFuente[]> {
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
    // La única de este fichero que sigue degradando a `[]` en vez de propagar
    // (ver `fallo`). La llama el Footer, que vive en el layout raíz: si
    // relanzara, un corte de la base devolvería un 500 en **todas** las
    // páginas, incluidos los artículos del blog, que son markdown y no
    // necesitan la base para nada. Lo que se pierde aquí es la etiqueta de
    // fase del proyecto y, en la portada, el listado de fuentes: cosmético.
    console.error("getEstado:", err);
    return [];
  }
}

export async function getConvocatoriasEuropeas(limit = 9): Promise<Convocatoria[]> {
  // Solo la usa la portada, que declara `revalidate`.
  const sql = clientCacheable();
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
    fallo("getConvocatoriasEuropeas", err);
  }
}

export async function getConvocatoriaById(id: string): Promise<ConvocatoriaDetalle | null> {
  const sql = clientCacheable();
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
             url_oficial, fuente_codigo,
             cuerpo, grupo, titulacion_requerida, num_plazas, tipo_acceso
      FROM convocatorias
      WHERE id = ${clave}
      LIMIT 1
    `;
    return (rows[0] as ConvocatoriaDetalle | undefined) ?? null;
  } catch (err) {
    fallo("getConvocatoriaById", err);
  }
}

/** Una fila del sitemap: la url de la ficha y cuándo cambió de verdad. */
export type EntradaSitemap = { id: string; lastmod: string };

/**
 * Ids para el sitemap, con la fecha real de cada ficha. Van **todas**, también
 * las de plazo cerrado: su página de detalle sigue existiendo
 * (`getConvocatoriaById` no filtra por plazo) y es lo que encuentra quien busca
 * en Google una convocatoria concreta meses después.
 *
 * El tope por defecto es el del propio protocolo de sitemaps —50.000 URLs por
 * fichero—, no una cifra elegida a ojo. El anterior era 1.000, y la llamada del
 * sitemap pasaba 500: con 797 filas en la tabla, Google veía 500 y las otras
 * 297 no existían para el buscador. Si algún día se rebasan las 50.000 hará
 * falta un índice de sitemaps, y entonces esto tendrá que partirse en varios.
 *
 * `fecha_ingesta` es el `lastmod` bueno y `actualizada_en` no: el upsert de los
 * scrapers la pisa con `now()` cada vez que vuelve a ver la fila, cambie o no,
 * así que anunciaría las ~2.800 fichas como recién modificadas en cada rastreo.
 * `fecha_ingesta` no entra en el `ON CONFLICT`, así que queda fija.
 */
export async function getConvocatoriaIds(limit = 50_000): Promise<EntradaSitemap[]> {
  // Cacheable: es la única consulta del sitemap, y con `no-store` su
  // `revalidate` de seis horas no llegaba a aplicarse nunca en producción.
  const sql = clientCacheable();
  if (!sql) return [];
  try {
    const rows = await sql`
      -- ISO 8601 explícito: \`::text\` da «2026-08-24 06:00:00+00», que V8 parsea
      -- hoy pero que no es un formato que \`new Date()\` tenga obligación de aceptar.
      SELECT id, to_char(fecha_ingesta AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS lastmod
      FROM convocatorias
      ORDER BY fecha_publicacion DESC, fecha_ingesta DESC, id DESC
      LIMIT ${limit}
    `;
    return rows as EntradaSitemap[];
  } catch (err) {
    fallo("getConvocatoriaIds", err);
  }
}

/** Cuántas fichas lista cada página del archivo. */
export const POR_PAGINA_ARCHIVO = 50;

/**
 * Una página del archivo completo: **todas** las convocatorias, también las de
 * plazo cerrado, con el mismo criterio y el mismo orden que `getConvocatoriaIds`.
 *
 * El buscador de la portada filtra en el cliente contra `/api/convocatorias`,
 * que está en `Disallow`. Eso dejaba las ~1.400 fichas sin un solo enlace que
 * un rastreador pudiera seguir: existían en el sitemap y en ningún otro sitio,
 * que es la señal de descubrimiento más débil que hay. Esta consulta es la que
 * alimenta el índice paginado que sí las enlaza.
 *
 * Cachea (`clientCacheable`), porque la ruta que la usa declara `revalidate`.
 */
export async function listarArchivo(
  pagina: number,
  porPagina = POR_PAGINA_ARCHIVO,
): Promise<Pagina> {
  const sql = clientCacheable();
  if (!sql) return { items: [], total: 0 };

  const desde = Math.max(0, (pagina - 1) * porPagina);

  try {
    const [items, conteo] = await Promise.all([
      sql`
        SELECT id, titulo, organismo, ambito, ccaa,
               fecha_publicacion::text AS fecha_publicacion,
               fecha_fin_plazo::text AS fecha_fin_plazo, fecha_fin_aprox, plazo_texto,
               url_oficial, fuente_codigo
        FROM convocatorias
        ORDER BY fecha_publicacion DESC, fecha_ingesta DESC, id DESC
        LIMIT ${porPagina} OFFSET ${desde}
      `,
      sql`SELECT count(*)::int AS total FROM convocatorias`,
    ]);

    return {
      items: items as Convocatoria[],
      total: (conteo as { total: number }[])[0]?.total ?? 0,
    };
  } catch (err) {
    fallo("listarArchivo", err);
  }
}

/** Número de páginas del archivo, para el sitemap y los enlaces prev/next. */
export async function contarPaginasArchivo(porPagina = POR_PAGINA_ARCHIVO): Promise<number> {
  const sql = clientCacheable();
  if (!sql) return 1;
  try {
    const rows = await sql`SELECT count(*)::int AS total FROM convocatorias`;
    const total = (rows as { total: number }[])[0]?.total ?? 0;
    return Math.max(1, Math.ceil(total / porPagina));
  } catch (err) {
    fallo("contarPaginasArchivo", err);
  }
}
