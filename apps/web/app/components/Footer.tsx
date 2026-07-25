import Link from "next/link";
import { LogoHorizontalDark } from "./Logo";
import { getEstado } from "@/lib/db";

function faseLabel(activas: number) {
  if (activas <= 1) return "Fase 1 · MVP";
  if (activas <= 5) return "Fase 2 · Cobertura nacional";
  return "Fase 3 · Consolidación";
}

export async function Footer() {
  const estado = await getEstado();
  const activas = estado.filter((e) => e.estado === "ok").length;

  return (
    <footer className="bg-navy text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 border-b border-white/20 pb-8 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Link href="/" className="inline-block text-white no-underline">
              <LogoHorizontalDark className="h-8 w-auto" />
            </Link>
            <p className="mt-4 text-sm text-white/80">
              Buscador unificado y gratuito de convocatorias de empleo público en España.
              Open source, sin publicidad, sobre datos abiertos oficiales.
            </p>
            <p className="mt-4 text-sm text-white/70">
              El proyecto es gratuito y su único coste es el dominio. Si te sirve, invítanos a un café.
            </p>
            <a
              href="https://ko-fi.com/I2I31CXQVM"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded bg-gold px-4 py-2 text-sm font-semibold text-navy no-underline hover:bg-gold-dark"
            >
              <span aria-hidden="true">☕</span> Invítanos a un café
            </a>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-white/70">
              Proyecto
            </h3>
            <ul className="space-y-1 text-sm">
              <li>
                <Link href="/estado" className="text-white no-underline hover:text-gold-light">
                  Estado del servicio
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-white no-underline hover:text-gold-light">
                  Blog
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/opoalerta/opoalerta/blob/main/ROADMAP.md"
                  className="text-white no-underline hover:text-gold-light"
                >
                  Hoja de ruta
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/opoalerta/opoalerta/blob/main/CONTRIBUTING.md"
                  className="text-white no-underline hover:text-gold-light"
                >
                  Contribuir
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/opoalerta/opoalerta"
                  className="text-white no-underline hover:text-gold-light"
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
                  className="text-white no-underline hover:text-gold-light"
                >
                  Código: AGPL-3.0
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/opoalerta/opoalerta/blob/main/docs/LICENSE"
                  className="text-white no-underline hover:text-gold-light"
                >
                  Documentación: CC BY-SA 4.0
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/opoalerta/opoalerta/blob/main/data/LICENSE"
                  className="text-white no-underline hover:text-gold-light"
                >
                  Datos transformados: ODbL-1.0
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="pt-4 text-sm text-white/70">
          Proyecto cívico · Open source · {faseLabel(activas)}
        </div>
      </div>
    </footer>
  );
}
