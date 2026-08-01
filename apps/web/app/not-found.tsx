import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "./components/Container";

export const metadata: Metadata = {
  title: "Página no encontrada",
  description: "La página que buscas no existe en OpoAlerta.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <Container className="py-16">
      <h1 className="text-3xl font-bold text-navy">Página no encontrada</h1>
      <p className="mt-4 text-lg text-slate">
        La página que buscas no existe o ha sido movida.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center rounded bg-gold px-6 py-3 text-base font-semibold text-navy no-underline hover:bg-navy hover:text-white"
      >
        Volver al inicio
      </Link>
    </Container>
  );
}
