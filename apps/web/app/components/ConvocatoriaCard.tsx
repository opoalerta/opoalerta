import Link from "next/link";
import type { Convocatoria } from "@/lib/db";

const CCAA_NOMBRE: Record<string, string> = {
  AN: "Andalucía", AR: "Aragón", AS: "Asturias", CB: "Cantabria", CE: "Ceuta",
  CL: "Castilla y León", CM: "Castilla-La Mancha", CN: "Canarias", CT: "Cataluña",
  EX: "Extremadura", GA: "Galicia", IB: "Illes Balears", MC: "Murcia", MD: "Madrid",
  ML: "Melilla", NC: "Navarra", PV: "País Vasco", RI: "La Rioja", VC: "C. Valenciana",
};

function fmtFecha(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function ConvocatoriaCard({ convocatoria }: { convocatoria: Convocatoria }) {
  const ambito =
    convocatoria.ambito === "estatal"
      ? "Estatal"
      : convocatoria.ambito === "europeo"
        ? "Unión Europea"
        : CCAA_NOMBRE[convocatoria.ccaa ?? ""] ?? convocatoria.ambito;

  return (
    <Link
      href={`/convocatoria/${encodeURIComponent(convocatoria.id)}`}
      className="group block rounded border border-border bg-white p-4 no-underline shadow-sm transition hover:border-gold hover:shadow-md"
    >
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate">
        <span className="rounded bg-cream px-2 py-1 font-semibold uppercase text-navy-700">
          {convocatoria.fuente_codigo}
        </span>
        <span>{ambito}</span>
        <span className="text-slate">· {fmtFecha(convocatoria.fecha_publicacion)}</span>
      </div>
      <h3 className="mb-1 text-base font-semibold leading-snug text-ink group-hover:text-navy-700">
        {convocatoria.titulo}
      </h3>
      <p className="text-sm text-slate">{convocatoria.organismo}</p>
      <p className="mt-2 text-xs">
        {convocatoria.fecha_fin_plazo ? (
          <span className="font-semibold text-navy-700">
            Plazo hasta {fmtFecha(convocatoria.fecha_fin_plazo)}
          </span>
        ) : convocatoria.plazo_texto ? (
          <span className="text-navy-700">
            Plazo: {convocatoria.plazo_texto.slice(0, 90)}
            {convocatoria.plazo_texto.length > 90 ? "…" : ""}
          </span>
        ) : (
          <span className="text-slate">Fin de plazo no indicado</span>
        )}
      </p>
    </Link>
  );
}
