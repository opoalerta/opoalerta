import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/blog";
import { Container } from "../components/Container";
import { JsonLd } from "../components/JsonLd";
import { getBaseUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Guías y recursos sobre oposiciones, convocatorias de empleo público y el funcionamiento de OpoAlerta.",
  alternates: { canonical: "/blog" },
};

export default async function BlogPage() {
  const posts = await getAllPosts();
  const baseUrl = getBaseUrl();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Blog de OpoAlerta",
    url: `${baseUrl}/blog`,
    description:
      "Guías y recursos sobre oposiciones, convocatorias de empleo público y el funcionamiento de OpoAlerta.",
    inLanguage: "es-ES",
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      url: `${baseUrl}/blog/${post.slug}`,
      datePublished: post.date,
      author: {
        "@type": "Organization",
        name: post.author,
      },
    })),
  };

  return (
    <>
      <JsonLd data={structuredData} />
      <section className="bg-cream py-12">
        <Container>
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold tracking-tight text-navy sm:text-4xl">
              Blog
            </h1>
            <p className="mt-4 text-lg text-slate">
              Guías, explicaciones y recursos para no perderte ninguna convocatoria de empleo público.
            </p>
          </div>
        </Container>
      </section>

      <section className="py-12">
        <Container>
          {posts.length === 0 ? (
            <p className="text-slate">Todavía no hay publicaciones.</p>
          ) : (
            <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <li key={post.slug}>
                  <article className="h-full rounded border border-border bg-white p-5 shadow-sm transition hover:border-gold">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate">
                      {new Date(post.date).toLocaleDateString("es-ES", {
                        dateStyle: "long",
                      })}
                    </p>
                    <h2 className="mt-2 text-lg font-semibold text-navy">
                      <Link
                        href={`/blog/${post.slug}`}
                        className="no-underline hover:underline"
                      >
                        {post.title}
                      </Link>
                    </h2>
                    <p className="mt-2 text-sm text-slate">{post.description}</p>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </Container>
      </section>
    </>
  );
}
