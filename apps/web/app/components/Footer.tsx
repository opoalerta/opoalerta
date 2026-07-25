import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-[#154273] text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 border-b border-white/20 pb-8 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <h2 className="mb-2 text-lg font-bold">OpoAlerta</h2>
            <p className="text-sm text-white/80">
              Buscador unificado y gratuito de convocatorias de empleo público en España.
              Open source, sin publicidad, sobre datos abiertos oficiales.
            </p>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-white/70">
              Proyecto
            </h3>
            <ul className="space-y-1 text-sm">
              <li>
                <Link href="/estado" className="text-white no-underline hover:underline">
                  Estado del servicio
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/opoalerta/opoalerta/blob/main/ROADMAP.md"
                  className="text-white no-underline hover:underline"
                >
                  Hoja de ruta
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/opoalerta/opoalerta/blob/main/CONTRIBUTING.md"
                  className="text-white no-underline hover:underline"
                >
                  Contribuir
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/opoalerta/opoalerta"
                  className="text-white no-underline hover:underline"
                >
                  Ver el código
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-white/70">
              Legal y datos
            </h3>
            <ul className="space-y-1 text-sm">
              <li>
                <a
                  href="https://github.com/opoalerta/opoalerta/blob/main/LICENSE"
                  className="text-white no-underline hover:underline"
                >
                  Código: AGPL-3.0
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/opoalerta/opoalerta/blob/main/docs/LICENSE"
                  className="text-white no-underline hover:underline"
                >
                  Documentación: CC BY-SA 4.0
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/opoalerta/opoalerta/blob/main/data/LICENSE"
                  className="text-white no-underline hover:underline"
                >
                  Datos transformados: ODbL-1.0
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="pt-4 text-sm text-white/70">
          Proyecto cívico · Open source · Fase 1 · MVP
        </div>
      </div>
    </footer>
  );
}
