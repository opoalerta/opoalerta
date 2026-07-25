import Link from "next/link";

export const metadata = {
  title: "Estado del servicio — OpoAlerta",
};

export default function Estado() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <Link href="/" className="text-sm text-white/50 hover:text-white">
        ← Inicio
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Estado del servicio</h1>
      <p className="mt-4 text-white/70">
        Esta página mostrará el estado de cada scraper de ingesta: última
        ejecución, convocatorias nuevas y si algún boletín está roto. De momento
        es un marcador de posición; se alimentará de la tabla{" "}
        <code className="rounded bg-white/10 px-1">ingest_runs</code> cuando la
        base de datos esté conectada (Fase 1).
      </p>

      <table className="mt-8 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-white/15 text-left text-white/50">
            <th className="py-2">Fuente</th>
            <th className="py-2">Última ingesta</th>
            <th className="py-2">Estado</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-white/5">
            <td className="py-2">BOE</td>
            <td className="py-2 text-white/40">—</td>
            <td className="py-2">
              <span className="rounded bg-amber-500/20 px-2 py-0.5 text-amber-300">
                pendiente de conectar
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </main>
  );
}
