import Link from "next/link";

const fuentes = [
  { codigo: "BOE", estado: "activo" },
  { codigo: "BOJA", estado: "previsto" },
  { codigo: "BOCM", estado: "previsto" },
  { codigo: "DOGV", estado: "previsto" },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <header className="mb-16">
        <p className="mb-4 inline-block rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-widest text-white/60">
          Proyecto cívico · Open source
        </p>
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
          Todas las <span style={{ color: "var(--accent)" }}>oposiciones</span> de
          España, en un solo sitio.
        </h1>
        <p className="mt-6 text-lg text-white/70">
          OpoAlerta agrega automáticamente las convocatorias de empleo público del
          BOE y los boletines autonómicos, las normaliza y te avisa cuando sale una
          plaza que encaja contigo. Gratis, sin publicidad, con el código y los
          datos abiertos.
        </p>
      </header>

      <section className="mb-16 grid gap-4 sm:grid-cols-3">
        {[
          ["Búsqueda unificada", "Por cuerpo, comunidad, titulación, fecha y plazo."],
          ["Alertas a medida", "Guarda filtros y recibe avisos por email o Telegram."],
          ["Datos oficiales", "Siempre con enlace y fecha de la fuente original."],
        ].map(([titulo, texto]) => (
          <div
            key={titulo}
            className="rounded-xl border border-white/10 bg-white/5 p-5"
          >
            <h2 className="font-semibold">{titulo}</h2>
            <p className="mt-2 text-sm text-white/60">{texto}</p>
          </div>
        ))}
      </section>

      <section className="mb-16">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-white/50">
          Fuentes
        </h2>
        <ul className="flex flex-wrap gap-2">
          {fuentes.map((f) => (
            <li
              key={f.codigo}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-sm"
            >
              <span className="font-medium">{f.codigo}</span>{" "}
              <span className="text-white/40">· {f.estado}</span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="flex flex-wrap items-center gap-4 border-t border-white/10 pt-8 text-sm text-white/60">
        <Link href="/estado" className="hover:text-white">
          Estado del servicio →
        </Link>
        <a
          href="https://github.com/opoalerta/opoalerta"
          className="hover:text-white"
        >
          Código en GitHub →
        </a>
        <span className="text-white/30">Fase 0 · Fundación</span>
      </footer>
    </main>
  );
}
