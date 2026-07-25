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
      : CCAA_NOMBRE[convocatoria.ccaa ?? ""] ?? convocatoria.ambito;

  return (
    <a
      href={convocatoria.url_oficial}
      className="group block rounded border border-[#e5e5e5] bg-white p-4 no-underline shadow-sm transition hover:border-[#01689b] hover:shadow-md"
    >
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-[#595959]">
        <span className="rounded bg-[#f3f5f6] px-2 py-1 font-semibold uppercase text-[#01689b]">
          {convocatoria.fuente_codigo}
        </span>
        <span>{ambito}</span>
        <span className="text-[#999999]">· {fmtFecha(convocatoria.fecha_publicacion)}</span>
      </div>
      <h3 className="mb-1 text-base font-semibold leading-snug text-[#1a1a1a] group-hover:text-[#01689b]">
        {convocatoria.titulo}
      </h3>
      <p className="text-sm text-[#595959]">{convocatoria.organismo}</p>
    </a>
  );
}
