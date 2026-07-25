import Link from "next/link";
import { LogoHorizontalDark } from "./Logo";

export function Header() {
  return (
    <header className="bg-navy text-white">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="text-white no-underline">
            <LogoHorizontalDark className="h-10 w-auto" />
          </Link>
          <nav aria-label="Principal">
            <ul className="flex flex-wrap items-center gap-6 text-sm font-medium">
              <li>
                <Link href="/" className="text-white no-underline hover:text-gold-light">
                  Inicio
                </Link>
              </li>
              <li>
                <Link href="/estado" className="text-white no-underline hover:text-gold-light">
                  Estado del servicio
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/opoalerta/opoalerta"
                  className="text-white no-underline hover:text-gold-light"
                >
                  Código en GitHub
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </div>
      <div className="h-1 bg-gold-light" aria-hidden="true" />
    </header>
  );
}
