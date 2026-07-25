import type { Metadata } from "next";
import "./globals.css";
import { Inter, Poppins } from "next/font/google";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { getBaseUrl } from "@/lib/site";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

const baseUrl = getBaseUrl();

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "OpoAlerta — Convocatorias de empleo público en España",
    template: "%s — OpoAlerta",
  },
  description:
    "Buscador unificado y gratuito de convocatorias de empleo público, oposiciones y ofertas de empleo en España. Datos oficiales del BOE y boletines autonómicos, código abierto y sin publicidad.",
  keywords: [
    "convocatorias empleo público",
    "oposiciones España",
    "ofertas empleo público",
    "BOE",
    "boletines autonómicos",
    "buscador oposiciones",
    "oposiciones estatales",
    "oposiciones comunidades autónomas",
  ],
  authors: [{ name: "OpoAlerta", url: baseUrl }],
  creator: "OpoAlerta",
  publisher: "OpoAlerta",
  category: "empleo público",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: baseUrl,
    siteName: "OpoAlerta",
    title: "OpoAlerta — Convocatorias de empleo público en España",
    description:
      "Buscador unificado y gratuito de convocatorias de empleo público, oposiciones y ofertas de empleo en España. Datos oficiales del BOE y boletines autonómicos.",
  },
  twitter: {
    card: "summary_large_image",
    site: "@opoalerta",
    title: "OpoAlerta — Convocatorias de empleo público en España",
    description:
      "Buscador unificado y gratuito de convocatorias de empleo público, oposiciones y ofertas de empleo en España.",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  other: {
    "msapplication-TileColor": "#1B3358",
    "theme-color": "#1B3358",
  },
  verification: {
    google: "oJMYPZXcvxXIKk5jAJe7rAImTWdwsyNRNzoJvQhR2W4",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${inter.variable} ${poppins.variable} flex min-h-screen flex-col font-sans`}>
        <Header />
        <main className="grow">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
