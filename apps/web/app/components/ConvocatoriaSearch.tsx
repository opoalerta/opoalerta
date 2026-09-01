"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CCAA_NOMBRE } from "@/lib/ccaa";
import type { Convocatoria } from "@/lib/db";
import { ConvocatoriaCard } from "./ConvocatoriaCard";
import { NoticeBox } from "./NoticeBox";
import { SuscripcionForm } from "./SuscripcionForm";

/**
 * Buscador de convocatorias.
 *
 * Filtraba en memoria, así que la página tenía que recibir todas las
 * convocatorias y un `LIMIT 500` evitaba que creciera sin control. Con 797 en
 * base de datos eso hacía que la web dijera «500 resultados» como si fueran
 * todas, y como el orden es por fecha descendente lo que se perdía eran las más
 * antiguas: justo las que llevan más tiempo con el plazo abierto.
 *
 * Ahora filtra Postgres. La página llega con la primera tanda ya renderizada en
 * servidor —así funciona sin JavaScript y los buscadores la indexan— y a partir
 * de ahí cada cambio de filtro pide la suya. El recuento es el real, no el
 * número de tarjetas visibles.
 */

const AMBITO_LABEL: Record<string, string> = {
  estatal: "Estatal",
  europeo: "Unión Europea",
  autonomico: "Autonómico",
  provincial: "Provincial",
  local: "Local",
  universidad: "Universidad",
  otro: "Otro",
};

const selectClass =
  "rounded border border-border-strong bg-white px-3 py-2.5 text-base text-ink focus:border-focus focus:ring-2 focus:ring-focus focus:ring-offset-1";

// Lo que se pide en cada tanda. Coincide con POR_PAGINA del servidor.
const PASO = 24;

// Escribir dispararía una petición por pulsación sin esperar un poco.
const ESPERA_MS = 300;

type Props = {
  /** Primera tanda, ya resuelta en servidor. */
  convocatorias: Convocatoria[];
  /** Total real que cumple los filtros vacíos. */
  total: number;
  /** Valores de los desplegables, sacados de la tabla y no del listado. */
  fuentes: string[];
  ambitos: string[];
  ccaas: string[];
};

export function ConvocatoriaSearch({ convocatorias, total, fuentes, ambitos, ccaas }: Props) {
  const [query, setQuery] = useState("");
  const [fuente, setFuente] = useState("");
  const [ambito, setAmbito] = useState("");
  const [ccaa, setCcaa] = useState("");
  const [orden, setOrden] = useState("recientes");

  const [items, setItems] = useState<Convocatoria[]>(convocatorias);
  const [totalActual, setTotalActual] = useState(total);
  const [cargando, setCargando] = useState(false);
  const [fallo, setFallo] = useState(false);

  // Distingue el primer render (ya servido) de los cambios de filtro, para no
  // repetir en el cliente la petición que el servidor acaba de resolver.
  const montado = useRef(false);
  // Una respuesta lenta de un filtro viejo no debe pisar a otra más reciente.
  const peticion = useRef(0);

  const pedir = useCallback(
    async (desde: number, acumular: boolean) => {
      const mia = ++peticion.current;
      setCargando(true);
      setFallo(false);
      try {
        const p = new URLSearchParams({
          q: query.trim(),
          fuente,
          ambito,
          ccaa,
          orden,
          desde: String(desde),
          cuantas: String(PASO),
        });
        const res = await fetch(`/api/convocatorias?${p}`);
        if (!res.ok) throw new Error(String(res.status));
        const datos = (await res.json()) as { items: Convocatoria[]; total: number };
        if (mia !== peticion.current) return;
        setItems((previos) => (acumular ? [...previos, ...datos.items] : datos.items));
        setTotalActual(datos.total);
      } catch {
        if (mia === peticion.current) setFallo(true);
      } finally {
        if (mia === peticion.current) setCargando(false);
      }
    },
    [query, fuente, ambito, ccaa, orden]
  );

  useEffect(() => {
    if (!montado.current) {
      montado.current = true;
      return;
    }
    const t = setTimeout(() => pedir(0, false), ESPERA_MS);
    return () => clearTimeout(t);
  }, [pedir]);

  const hasFilters = Boolean(query || fuente || ambito || ccaa);
  const restantes = totalActual - items.length;

  function reset() {
    setQuery("");
    setFuente("");
    setAmbito("");
    setCcaa("");
    setOrden("recientes");
  }

  const chipClass = (activo: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm font-medium transition focus:ring-2 focus:ring-focus focus:ring-offset-1 focus:outline-none ${
      activo
        ? "border-gold-dark bg-gold text-navy"
        : "border-border-strong bg-white text-navy-700 hover:bg-cream"
    }`;

  return (
    <div>
      {fuentes.length > 1 && (
        // aria-pressed porque son interruptores, no enlaces: sin él, el estado
        // activo lo transmitía solo el color.
        <div role="group" aria-label="Filtrar por fuente" className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={!fuente}
            onClick={() => setFuente("")}
            className={chipClass(!fuente)}
          >
            Todas
          </button>
          {fuentes.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={fuente === f}
              onClick={() => setFuente(f)}
              className={chipClass(fuente === f)}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative grow">
          <label htmlFor="convocatoria-search" className="sr-only">
            Buscar convocatorias
          </label>
          <input
            id="convocatoria-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Busca por puesto, organismo o fuente…"
            className="w-full rounded border border-border-strong bg-white px-4 py-2.5 text-base text-ink placeholder:text-slate focus:border-focus focus:ring-2 focus:ring-focus focus:ring-offset-1"
          />
        </div>

        <label htmlFor="filtro-fuente" className="sr-only">
          Filtrar por fuente
        </label>
        <select
          id="filtro-fuente"
          value={fuente}
          onChange={(e) => setFuente(e.target.value)}
          className={selectClass}
        >
          <option value="">Todas las fuentes</option>
          {fuentes.map((f) => (
            <option key={f} value={f}>
              {f.toUpperCase()}
            </option>
          ))}
        </select>

        <label htmlFor="filtro-ambito" className="sr-only">
          Filtrar por ámbito
        </label>
        <select
          id="filtro-ambito"
          value={ambito}
          onChange={(e) => setAmbito(e.target.value)}
          className={selectClass}
        >
          <option value="">Todos los ámbitos</option>
          {ambitos.map((a) => (
            <option key={a} value={a}>
              {AMBITO_LABEL[a] ?? a}
            </option>
          ))}
        </select>

        <label htmlFor="filtro-ccaa" className="sr-only">
          Filtrar por comunidad autónoma
        </label>
        <select
          id="filtro-ccaa"
          value={ccaa}
          onChange={(e) => setCcaa(e.target.value)}
          className={selectClass}
        >
          <option value="">Toda España</option>
          {ccaas.map((c) => (
            <option key={c} value={c}>
              {CCAA_NOMBRE[c] ?? c}
            </option>
          ))}
        </select>

        <label htmlFor="orden-resultados" className="sr-only">
          Ordenar resultados
        </label>
        <select
          id="orden-resultados"
          value={orden}
          onChange={(e) => setOrden(e.target.value)}
          className={selectClass}
        >
          <option value="recientes">Más recientes</option>
          <option value="urgencia">Plazo cercano</option>
        </select>

        {hasFilters && (
          <button
            type="button"
            onClick={reset}
            className="shrink-0 rounded border border-border-strong bg-white px-4 py-2.5 text-sm font-medium text-navy-700 hover:bg-cream focus:ring-2 focus:ring-focus focus:ring-offset-1 focus:outline-none"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Filtrar no mueve el foco ni recarga: sin aria-live, quien usa lector de
          pantalla no recibía ninguna señal de que el resultado había cambiado. */}
      <div
        className="mb-4 flex items-center justify-between text-sm text-slate"
        role="status"
        aria-live="polite"
      >
        <span>
          {cargando && items.length === 0
            ? "Buscando…"
            : `${totalActual} ${totalActual === 1 ? "convocatoria" : "convocatorias"}`}
          {query && ` para “${query}”`}
        </span>
        {items.length > 0 && (
          <span className="hidden sm:inline">
            Mostrando {items.length} de {totalActual}
          </span>
        )}
      </div>

      {fallo ? (
        <NoticeBox title="No se pudo completar la búsqueda" variant="warning">
          Ha fallado la conexión con el servidor. Vuelve a intentarlo en unos
          segundos.
        </NoticeBox>
      ) : total === 0 && !hasFilters ? (
        <NoticeBox title="Sin convocatorias cargadas" variant="warning">
          Aún no hay convocatorias cargadas. La ingesta del BOE corre cada día a las
          06:00 UTC. Si acabas de desplegar, comprueba que{" "}
          <code>DATABASE_URL</code> está configurada en el entorno.
        </NoticeBox>
      ) : items.length === 0 && !cargando ? (
        <NoticeBox title="Ninguna coincidencia" variant="info">
          No hemos encontrado convocatorias con esos criterios. Prueba con otro
          término, fuente, ámbito o comunidad autónoma.
        </NoticeBox>
      ) : (
        <>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((c) => (
              <li key={c.id}>
                <ConvocatoriaCard convocatoria={c} />
              </li>
            ))}
          </ul>

          {restantes > 0 && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => pedir(items.length, true)}
                disabled={cargando}
                className="rounded bg-gold px-6 py-2.5 text-base font-semibold text-navy hover:bg-navy hover:text-white focus:ring-2 focus:ring-focus focus:ring-offset-1 focus:outline-none disabled:opacity-60"
              >
                {cargando ? "Cargando…" : `Ver más (${restantes} restantes)`}
              </button>
            </div>
          )}
        </>
      )}

      {total > 0 && <SuscripcionForm q={query} fuente={fuente} ambito={ambito} />}
    </div>
  );
}
