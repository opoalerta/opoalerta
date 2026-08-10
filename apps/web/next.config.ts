import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    ];
  },
};

export default nextConfig;
