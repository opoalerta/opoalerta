import type { MetadataRoute } from "next";
import { contarPaginasArchivo, getConvocatoriaIds } from "@/lib/db";
import { getAllPosts } from "@/lib/blog";
import { getBaseUrl } from "@/lib/site";

// Regenerarlo en cada petición costaba ~1,6 s y 262 KB por rastreo, y el
// contenido solo cambia cuando entra la ingesta diaria de las 06:00 UTC.
export const revalidate = 21600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();
  // Sin recorte: el sitemap es lo que le dice a Google qué páginas existen, y
  // pedir 500 de 797 dejaba fuera precisamente las más antiguas, que son las
  // que la gente busca por nombre cuando ya no están en portada.
  const [ids, posts, paginasArchivo] = await Promise.all([
    getConvocatoriaIds(),
    getAllPosts(),
    contarPaginasArchivo(),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/sobre`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      // Estaba anunciada como «daily» y con más prioridad que el blog. Es una
      // página de diagnóstico: cambia todos los días, así que Google volvía a
      // por ella constantemente, y no responde a ninguna búsqueda.
      url: `${baseUrl}/estado`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  // El archivo paginado también va al sitemap: son las páginas que llevan a las
  // fichas, así que interesa que Google las rastree pronto y a menudo.
  const archivoPages: MetadataRoute.Sitemap = Array.from(
    { length: paginasArchivo },
    (_, i) => ({
      url: i === 0 ? `${baseUrl}/convocatorias` : `${baseUrl}/convocatorias/pagina/${i + 1}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: i === 0 ? 0.9 : 0.6,
    }),
  );

  const blogPages: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const convocatoriaPages: MetadataRoute.Sitemap = ids.map((id) => ({
    url: `${baseUrl}/convocatoria/${id}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticPages, ...archivoPages, ...blogPages, ...convocatoriaPages];
}
