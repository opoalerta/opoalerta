import Link from "next/link";
import { LogoHorizontalDark } from "./Logo";

const navItems = [
  { href: "/", label: "Inicio" },
  { href: "/estado", label: "Estado del servicio" },
  { href: "https://github.com/opoalerta/opoalerta", label: "Código en GitHub", external: true },
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
            <ul className="flex flex-wrap items-center gap-6 text-sm font-medium">
              {navItems.map((item) => (
                <li key={item.href}>
                  {item.external ? (
                    <a
                      href={item.href}
                      className="header-link text-white no-underline hover:text-gold-light"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <Link
                      href={item.href}
                      className="header-link text-white no-underline hover:text-gold-light"
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
