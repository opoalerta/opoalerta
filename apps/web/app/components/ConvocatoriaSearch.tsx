"use client";

import { useState, useMemo } from "react";
import type { Convocatoria } from "@/lib/db";
import { ConvocatoriaCard } from "./ConvocatoriaCard";
import { NoticeBox } from "./NoticeBox";

function normalize(str: string): string {
  return str.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

const AMBITO_LABEL: Record<string, string> = {
  estatal: "Estatal",
  autonomico: "Autonómico",
  provincial: "Provincial",
  local: "Local",
  universidad: "Universidad",
  otro: "Otro",
};

const selectClass =
  "rounded border border-[#cccccc] bg-white px-3 py-2.5 text-base text-[#1a1a1a] focus:border-[#01689b] focus:ring-2 focus:ring-[#01689b] focus:ring-offset-1";

export function ConvocatoriaSearch({
  convocatorias,
}: {
  convocatorias: Convocatoria[];
}) {
  const [query, setQuery] = useState("");
  const [fuente, setFuente] = useState("");
  const [ambito, setAmbito] = useState("");

  const fuentes = useMemo(
    () => Array.from(new Set(convocatorias.map((c) => c.fuente_codigo))).sort(),
    [convocatorias]
  );
  const ambitos = useMemo(
    () => Array.from(new Set(convocatorias.map((c) => c.ambito))).sort(),
    [convocatorias]
  );

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return convocatorias.filter((c) => {
      if (fuente && c.fuente_codigo !== fuente) return false;
      if (ambito && c.ambito !== ambito) return false;
      if (
        q &&
        !normalize(c.titulo).includes(q) &&
        !normalize(c.organismo).includes(q) &&
        !normalize(c.fuente_codigo).includes(q)
      )
        return false;
      return true;
    });
  }, [convocatorias, query, fuente, ambito]);

  const hasFilters = Boolean(query || fuente || ambito);
  const reset = () => {
    setQuery("");
    setFuente("");
    setAmbito("");
  };

  return (
    <div>
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
            className="w-full rounded border border-[#cccccc] bg-white px-4 py-2.5 text-base text-[#1a1a1a] placeholder:text-[#999999] focus:border-[#01689b] focus:ring-2 focus:ring-[#01689b] focus:ring-offset-1"
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

        {hasFilters && (
          <button
            type="button"
            onClick={reset}
            className="shrink-0 rounded border border-[#cccccc] bg-white px-4 py-2.5 text-sm font-medium text-[#01689b] hover:bg-[#f3f5f6]"
          >
            Limpiar
          </button>
        )}
      </div>

      <div className="mb-4 flex items-center justify-between text-sm text-[#595959]">
        <span>
          {filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}
          {query && ` para “${query}”`}
        </span>
        {!hasFilters && convocatorias.length > 0 && (
          <span className="hidden sm:inline">
            Mostrando las {convocatorias.length} más recientes
          </span>
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
          No hemos encontrado convocatorias con esos criterios. Prueba con otro
          término, fuente o ámbito.
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
