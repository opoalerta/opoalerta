import Link from "next/link";
import { LogoHorizontalDark } from "./Logo";

// La cabecera sale en todas las páginas, así que es el enlace interno que más
// pesa. Estaba gastada en /estado —una página de diagnóstico— y en un enlace
// externo, mientras /sobre y /blog solo se alcanzaban desde el footer y el
// archivo de convocatorias desde ningún sitio. El orden es el de importancia.
const navItems = [
  { href: "/", label: "Inicio" },
  { href: "/convocatorias", label: "Convocatorias" },
  { href: "/oposiciones", label: "Por puesto" },
  { href: "/blog", label: "Blog" },
  { href: "/sobre", label: "Sobre el proyecto" },
  { href: "/estado", label: "Estado" },
  { href: "https://github.com/opoalerta/opoalerta", label: "GitHub", external: true },
];

export function Header() {
  return (
    <header className="bg-navy text-white">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/"
            className="inline-block text-white no-underline hover:opacity-90 focus-visible:rounded"
          >
            <LogoHorizontalDark className="h-10 w-auto" />
          </Link>
          <nav aria-label="Principal">
            {/* En móvil los enlaces medían 16 px de alto y se tocaban a ciegas: cada
                uno lleva ahora su propia zona de 44 px, y el hueco lo da el
                relleno en vez del gap. */}
            <ul className="-mx-2 flex flex-wrap items-center gap-x-2 text-sm font-medium sm:mx-0 sm:gap-x-6">
              {navItems.map((item) => (
                <li key={item.href}>
                  {item.external ? (
                    <a
                      href={item.href}
                      className="header-link inline-flex min-h-11 items-center px-2 text-white no-underline hover:text-gold-light sm:min-h-0 sm:px-0"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <Link
                      href={item.href}
                      className="header-link inline-flex min-h-11 items-center px-2 text-white no-underline hover:text-gold-light sm:min-h-0 sm:px-0"
                    >
                      {item.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
      <div className="h-1 bg-gold-light" aria-hidden="true" />
    </header>
  );
}
