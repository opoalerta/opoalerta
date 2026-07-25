import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPostBySlug, getPostSlugs } from "@/lib/blog";
import { Container } from "../../components/Container";
import { JsonLd } from "../../components/JsonLd";
import { getBaseUrl } from "@/lib/site";

export async function generateStaticParams() {
  const slugs = getPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const baseUrl = getBaseUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    url: `${baseUrl}/blog/${post.slug}`,
    datePublished: post.date,
    author: {
      "@type": "Organization",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: "OpoAlerta",
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/icon.svg`,
      },
    },
    inLanguage: "es-ES",
  };

  return (
    <>
      <JsonLd data={structuredData} />
      <article className="bg-cream py-12">
        <Container>
          <div className="mx-auto max-w-3xl">
            <header className="mb-8">
              <p className="text-sm font-medium uppercase tracking-wide text-slate">
                {new Date(post.date).toLocaleDateString("es-ES", {
                  dateStyle: "long",
                })}
                {" · "}
                {post.author}
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy sm:text-4xl">
                {post.title}
              </h1>
              <p className="mt-4 text-lg text-slate">{post.description}</p>
              {post.tags.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <li
                      key={tag}
                      className="rounded bg-white px-2 py-1 text-xs font-medium text-navy-700"
                    >
                      #{tag}
                    </li>
                  ))}
                </ul>
              )}
            </header>

            <div
              className="prose prose-lg max-w-none text-ink prose-headings:font-heading prose-headings:text-navy prose-a:text-navy-700 hover:prose-a:text-navy"
              dangerouslySetInnerHTML={{ __html: post.contentHtml }}
            />
          </div>
        </Container>
      </article>
    </>
  );
}
