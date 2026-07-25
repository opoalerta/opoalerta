import { getBaseUrl } from "@/lib/site";

export default function robots() {
  const baseUrl = getBaseUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/estado", "/convocatoria/"],
        disallow: ["/api/", "/alertas/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
