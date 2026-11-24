import postgres from "postgres";

// Las filas se tipan en cada llamada (`as Convocatoria[]`), como con el driver
// de Neon. Los tipos de `postgres` son más estrictos y obligarían a un
// `as unknown as` en cada consulta, así que se expone la misma forma laxa.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Fila = Record<string, any>;

export interface Sql {
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<Fila[]>;
  /** Sin parámetros, fragmento para interpolar (p. ej. un ORDER BY fijo); con ellos, consulta. */
  unsafe(query: string, params?: unknown[]): Promise<Fila[]>;
}

const global = globalThis as unknown as { __opoalertaSql?: postgres.Sql };

/**
 * Cliente Postgres compartido, por TCP.
 *
 * Sustituye al driver HTTP de Neon (`@neondatabase/serverless`), que solo sabe
 * hablar con Neon: con él la web no podía apuntar a otro Postgres. Este vale
 * para los dos, así que el cambio de base es solo cambiar `DATABASE_URL`.
 *
 * Una sola instancia por proceso (en `globalThis` para que el HMR de `next dev`
 * no abra un pool nuevo en cada recarga). `prepare: false` porque el pooler de
 * Neon (PgBouncer en modo transacción) no admite sentencias preparadas con
 * nombre; en un Postgres propio solo cuesta un poco de planificación.
 *
 * Devuelve null si no hay DATABASE_URL, para que build y previews no rompan.
 */
export function sqlClient(): Sql | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  global.__opoalertaSql ??= postgres(url, {
    prepare: false,
    // En Vercel cada instancia de función abre su propio pool: con más de una
    // conexión por instancia se agotan las de Neon en un pico de tráfico.
    max: Number(process.env.DATABASE_POOL_MAX ?? (process.env.VERCEL === "1" ? 1 : 5)),
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return global.__opoalertaSql as unknown as Sql;
}
