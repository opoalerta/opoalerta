import Link from "next/link";

export function Header() {
  return (
    <header className="bg-[#154273] text-white">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="text-white no-underline">
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-bold tracking-tight">OpoAlerta</span>
              <span className="hidden text-sm font-normal text-white/80 sm:inline">
                Convocatorias de empleo público
              </span>
            </div>
          </Link>
          <nav aria-label="Principal">
            <ul className="flex flex-wrap items-center gap-6 text-sm font-medium">
              <li>
                <Link href="/" className="text-white no-underline hover:text-white/90">
                  Inicio
                </Link>
              </li>
              <li>
                <Link href="/estado" className="text-white no-underline hover:text-white/90">
                  Estado del servicio
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/opoalerta/opoalerta"
                  className="text-white no-underline hover:text-white/90"
                >
                  Código en GitHub
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </div>
      <div className="h-1 bg-[#f9e11e]" aria-hidden="true" />
    </header>
  );
}
