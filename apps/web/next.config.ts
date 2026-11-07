import type { NextConfig } from "next";

/**
 * Cabeceras de seguridad para todo el sitio.
 *
 * No hay CSP de scripts: Next mete scripts en línea para hidratar y Vercel
 * inyecta los suyos, así que una política de `script-src` exigiría nonces y
 * volvería dinámicas todas las páginas ISR. Lo que sí se fija es lo que no
 * rompe nada y cierra lo habitual: que nadie enmarque la web (los botones de
 * confirmar y dar de baja son justo lo que se querría secuestrar con un
 * iframe), que no se interpreten ficheros con otro tipo, que la URL completa
 * —con el token de las alertas— no salga en el Referer hacia otros dominios,
 * y que la página no pueda pedir cámara, micro ni ubicación.
 */
const cabecerasSeguridad = [
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  // `x-powered-by: Next.js` solo le sirve a quien busca versiones vulnerables.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: cabecerasSeguridad }];
  },
  async redirects() {
    return [
      // www servía un 200 propio, así que Google rastreaba cada página dos
      // veces y descartaba la de www por la canónica. Funcionar, funcionaba;
      // lo que se iba era presupuesto de rastreo de un dominio recién nacido.
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.opoalerta.es" }],
        destination: "https://opoalerta.es/:path*",
        permanent: true,
      },
      // «¿Qué es el BOE?» eran 240 palabras que repetían media guía; su
      // contenido vive ahora en la guía de 2026. La URL estaba indexada.
      {
        source: "/blog/que-es-el-boe",
        destination: "/blog/oposiciones-2026-guia-completa",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
