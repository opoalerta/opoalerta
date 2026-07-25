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
    ok: { label: "OK", className: "bg-[#f4f9f0] text-[#39870c]" },
    error: { label: "Error", className: "bg-[#fff4f4] text-[#d52b1e]" },
    en_curso: { label: "En curso", className: "bg-[#fff8e6] text-[#8a6d00]" },
  };
  const s = estado ? map[estado] : undefined;
  if (!s) {
    return (
      <span className="inline-flex items-center rounded bg-[#f3f5f6] px-2 py-1 text-xs font-medium text-[#595959]">
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
          <tr className="border-b-2 border-[#01689b] bg-[#f3f5f6]">
            <th className="px-4 py-3 font-semibold text-[#154273]">Fuente</th>
            <th className="px-4 py-3 font-semibold text-[#154273]">Convocatorias</th>
            <th className="px-4 py-3 font-semibold text-[#154273]">Última ejecución</th>
            <th className="px-4 py-3 font-semibold text-[#154273]">Estado</th>
          </tr>
        </thead>
        <tbody>
          {fuentes.map((f) => (
            <tr
              key={f.fuente_codigo}
              className="border-b border-[#e5e5e5] hover:bg-[#f9f9f9]"
            >
              <td className="px-4 py-3">
                <span className="font-semibold uppercase text-[#01689b]">
                  {f.fuente_codigo}
                </span>
                <span className="ml-2 text-[#595959]">{f.nombre}</span>
              </td>
              <td className="px-4 py-3 font-medium text-[#1a1a1a]">{f.total}</td>
              <td className="px-4 py-3 text-[#595959]">
                {fmtInstante(f.ultima_ejecucion ?? f.ultima_ingesta)}
                {f.estado === "ok" &&
                  f.ultimas_nuevas != null &&
                  f.ultimas_nuevas > 0 && (
                    <span className="ml-2 text-xs text-[#39870c]">
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
