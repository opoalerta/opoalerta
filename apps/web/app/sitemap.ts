import type { MetadataRoute } from "next";
import { getConvocatoriaIds } from "@/lib/db";
import { getAllPosts } from "@/lib/blog";
import { getBaseUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();
  // Sin recorte: el sitemap es lo que le dice a Google qué páginas existen, y
  // pedir 500 de 797 dejaba fuera precisamente las más antiguas, que son las
  // que la gente busca por nombre cuando ya no están en portada.
  const [ids, posts] = await Promise.all([getConvocatoriaIds(), getAllPosts()]);

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
      url: `${baseUrl}/estado`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

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

  return [...staticPages, ...blogPages, ...convocatoriaPages];
}
