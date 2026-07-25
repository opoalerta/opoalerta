import type { EstadoFuente } from "@/lib/db";

function fmtInstante(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  });
}

function EstadoBadge({ estado }: { estado: string | null }) {
  const map: Record<string, { label: string; className: string }> = {
    ok: { label: "OK", className: "bg-success-bg text-success" },
    error: { label: "Error", className: "bg-danger-bg text-danger" },
    en_curso: { label: "En curso", className: "bg-warning-bg text-warning" },
  };
  const s = estado ? map[estado] : undefined;
  if (!s) {
    return (
      <span className="inline-flex items-center rounded bg-cream px-2 py-1 text-xs font-medium text-slate">
        sin ejecuciones
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-1 text-xs font-semibold ${s.className}`}
    >
      {s.label}
    </span>
  );
}

export function EstadoTable({ fuentes }: { fuentes: EstadoFuente[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b-2 border-gold bg-cream">
            <th className="px-4 py-3 font-semibold text-navy">Fuente</th>
            <th className="px-4 py-3 font-semibold text-navy">Convocatorias</th>
            <th className="px-4 py-3 font-semibold text-navy">Última ejecución</th>
            <th className="px-4 py-3 font-semibold text-navy">Estado</th>
          </tr>
        </thead>
        <tbody>
          {fuentes.map((f) => (
            <tr
              key={f.fuente_codigo}
              className="border-b border-border hover:bg-cream"
            >
              <td className="px-4 py-3">
                <span className="font-semibold uppercase text-navy-700">
                  {f.fuente_codigo}
                </span>
                <span className="ml-2 text-slate">{f.nombre}</span>
              </td>
              <td className="px-4 py-3 font-medium text-ink">{f.total}</td>
              <td className="px-4 py-3 text-slate">
                {fmtInstante(f.ultima_ejecucion ?? f.ultima_ingesta)}
                {f.estado === "ok" &&
                  f.ultimas_nuevas != null &&
                  f.ultimas_nuevas > 0 && (
                    <span className="ml-2 text-xs text-success">
                      +{f.ultimas_nuevas} nuevas
                    </span>
                  )}
              </td>
              <td className="px-4 py-3">
                <EstadoBadge estado={f.estado} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
