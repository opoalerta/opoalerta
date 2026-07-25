import Link from "next/link";
import { getConvocatorias } from "@/lib/db";

export const dynamic = "force-dynamic";

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

export default async function Home() {
  const convocatorias = await getConvocatorias(30);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-12">
        <p className="mb-4 inline-block rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-widest text-white/60">
          Proyecto cívico · Open source
        </p>
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
          Todas las <span style={{ color: "var(--accent)" }}>oposiciones</span> de
          España, en un solo sitio.
        </h1>
        <p className="mt-6 text-lg text-white/70">
          OpoAlerta agrega automáticamente las convocatorias de empleo público del
          BOE y los boletines autonómicos. Gratis, sin publicidad, con el código y
          los datos abiertos.
        </p>
      </header>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">
            Últimas convocatorias
          </h2>
          <span className="text-xs text-white/40">
            {convocatorias.length > 0 ? `${convocatorias.length} recientes` : ""}
          </span>
        </div>

        {convocatorias.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
            Aún no hay convocatorias cargadas. La ingesta del BOE corre cada día a
            las 06:00 UTC. Si acabas de desplegar, comprueba que{" "}
            <code className="rounded bg-white/10 px-1">DATABASE_URL</code> está
            configurada en el entorno.
          </p>
        ) : (
          <ul className="space-y-3">
            {convocatorias.map((c) => (
              <li
                key={c.id}
                className="rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-white/25"
              >
                <a href={c.url_oficial} className="block">
                  <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-white/50">
                    <span className="rounded bg-white/10 px-2 py-0.5 font-medium uppercase">
                      {c.fuente_codigo}
                    </span>
                    <span>
                      {c.ambito === "estatal"
                        ? "Estatal"
                        : CCAA_NOMBRE[c.ccaa ?? ""] ?? c.ambito}
                    </span>
                    <span>· {fmtFecha(c.fecha_publicacion)}</span>
                  </div>
                  <p className="text-sm font-medium leading-snug">{c.titulo}</p>
                  <p className="mt-1 text-xs text-white/50">{c.organismo}</p>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="mt-16 flex flex-wrap items-center gap-4 border-t border-white/10 pt-8 text-sm text-white/60">
        <Link href="/estado" className="hover:text-white">
          Estado del servicio →
        </Link>
        <a
          href="https://github.com/opoalerta/opoalerta"
          className="hover:text-white"
        >
          Código en GitHub →
        </a>
        <span className="text-white/30">Fase 1 · MVP</span>
      </footer>
    </main>
  );
}
