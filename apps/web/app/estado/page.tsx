import Link from "next/link";
import { getEstado } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Estado del servicio — OpoAlerta",
};

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

export default async function Estado() {
  const fuentes = await getEstado();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/" className="text-sm text-white/50 hover:text-white">
        ← Inicio
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Estado del servicio</h1>
      <p className="mt-4 text-white/70">
        Convocatorias ingeridas por fuente y fecha de la última ingesta. La
        ingesta del BOE corre a diario a las 06:00 UTC.
      </p>

      {fuentes.length === 0 ? (
        <p className="mt-8 rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
          Sin datos todavía. Comprueba que{" "}
          <code className="rounded bg-white/10 px-1">DATABASE_URL</code> está
          configurada en el entorno.
        </p>
      ) : (
        <table className="mt-8 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/15 text-left text-white/50">
              <th className="py-2">Fuente</th>
              <th className="py-2">Convocatorias</th>
              <th className="py-2">Última ingesta</th>
            </tr>
          </thead>
          <tbody>
            {fuentes.map((f) => (
              <tr key={f.fuente_codigo} className="border-b border-white/5">
                <td className="py-2">
                  <span className="font-medium uppercase">{f.fuente_codigo}</span>
                  <span className="ml-2 text-white/40">{f.nombre}</span>
                </td>
                <td className="py-2">{f.total}</td>
                <td className="py-2 text-white/60">
                  {f.total > 0 ? (
                    fmtInstante(f.ultima_ingesta)
                  ) : (
                    <span className="rounded bg-amber-500/20 px-2 py-0.5 text-amber-300">
                      sin datos
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
