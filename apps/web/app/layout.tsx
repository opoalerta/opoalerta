import type { Metadata } from "next";
import "./globals.css";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";

export const metadata: Metadata = {
  metadataBase: new URL("https://opoalerta.es"),
  title: {
    default: "OpoAlerta — Convocatorias de empleo público, en un solo sitio",
    template: "%s — OpoAlerta",
  },
  description:
    "Buscador unificado y gratuito de convocatorias de empleo público en España. Open source, sin publicidad, sobre datos abiertos oficiales.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "https://opoalerta.es",
    siteName: "OpoAlerta",
    title: "OpoAlerta — Convocatorias de empleo público, en un solo sitio",
    description:
      "Buscador unificado y gratuito de convocatorias de empleo público en España. Open source, sin publicidad, sobre datos abiertos oficiales.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="flex min-h-screen flex-col">
        <Header />
        <main className="grow">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
