import Link from "next/link";
import { LogoHorizontalDark } from "./Logo";

/**
 * El pie no lee la base de datos, y tiene que seguir así.
 *
 * Vive en el layout raíz, de modo que cualquier dato que lea pasa a formar parte
 * de las ~18.900 páginas. Hasta noviembre de 2026 leía `getEstado` solo para
 * pintar una etiqueta de fase, y esa lectura lleva la etiqueta de caché
 * `estado-fuentes`, que /api/revalidar invalida tras cada ingesta. Next
 * invalida con ella todas las páginas que la usaron: cada noche el sitio entero
 * quedaba caducado (`x-vercel-cache: STALE`) y los rastreadores regeneraban
 * las fichas una a una. Cada regeneración es una escritura ISR en Vercel y una
 * consulta a Neon, justo lo que el resto de la caché intenta evitar.
 */
export function Footer() {
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
              href="https://ko-fi.com/zaswear"
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
            <ul className="text-sm sm:space-y-1 [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center sm:[&_a]:min-h-0">
              <li>
                <Link
                  href="/convocatorias"
                  className="text-white no-underline hover:text-gold-light"
                >
                  Todas las convocatorias
                </Link>
              </li>
              <li>
                <Link href="/oposiciones" className="text-white no-underline hover:text-gold-light">
                  Oposiciones por puesto y comunidad
                </Link>
              </li>
              <li>
                <Link href="/sobre" className="text-white no-underline hover:text-gold-light">
                  Sobre el proyecto
                </Link>
              </li>
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
                <a href="/rss.xml" className="text-white no-underline hover:text-gold-light">
                  Feed RSS
                </a>
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
            <ul className="text-sm sm:space-y-1 [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center sm:[&_a]:min-h-0">
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
          Proyecto cívico · Open source
        </div>
      </div>
    </footer>
  );
}
