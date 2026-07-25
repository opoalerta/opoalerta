import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpoAlerta — Convocatorias de empleo público, en un solo sitio",
  description:
    "Buscador unificado y gratuito de convocatorias de empleo público en España. Open source, sin publicidad, sobre datos abiertos oficiales.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
