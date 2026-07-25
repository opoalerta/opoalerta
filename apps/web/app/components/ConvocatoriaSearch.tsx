"use client";

import { useState, useMemo } from "react";
import type { Convocatoria } from "@/lib/db";
import { ConvocatoriaCard } from "./ConvocatoriaCard";
import { NoticeBox } from "./NoticeBox";

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function ConvocatoriaSearch({
  convocatorias,
}: {
  convocatorias: Convocatoria[];
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return convocatorias;
    return convocatorias.filter(
      (c) =>
        normalize(c.titulo).includes(q) ||
        normalize(c.organismo).includes(q) ||
        normalize(c.fuente_codigo).includes(q)
    );
  }, [convocatorias, query]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
            className="w-full rounded border border-[#cccccc] bg-white px-4 py-2.5 text-base text-[#1a1a1a] placeholder:text-[#999999] focus:border-[#01689b] focus:ring-2 focus:ring-[#01689b] focus:ring-offset-1"
          />
        </div>
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="shrink-0 rounded border border-[#cccccc] bg-white px-4 py-2.5 text-sm font-medium text-[#01689b] hover:bg-[#f3f5f6]"
          >
            Limpiar búsqueda
          </button>
        )}
      </div>

      <div className="mb-4 flex items-center justify-between text-sm text-[#595959]">
        <span>
          {filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}
          {query && ` para “${query}”`}
        </span>
        {!query && convocatorias.length > 0 && (
          <span className="hidden sm:inline">Mostrando las {convocatorias.length} más recientes</span>
        )}
      </div>

      {convocatorias.length === 0 ? (
        <NoticeBox title="Sin convocatorias cargadas" variant="warning">
          Aún no hay convocatorias cargadas. La ingesta del BOE corre cada día a las
          06:00 UTC. Si acabas de desplegar, comprueba que{" "}
          <code>DATABASE_URL</code> está configurada en el entorno.
        </NoticeBox>
      ) : filtered.length === 0 ? (
        <NoticeBox title="Ninguna coincidencia" variant="info">
          No hemos encontrado convocatorias que coincidan con tu búsqueda. Prueba con
          otro término o revisa el organismo.
        </NoticeBox>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <li key={c.id}>
              <ConvocatoriaCard convocatoria={c} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
