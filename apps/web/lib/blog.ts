import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

export type Post = {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  tags: string[];
  contentHtml: string;
};

const postsDirectory = path.join(process.cwd(), "content", "blog");

function parseDate(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString().split("T")[0];
  return "";
}

export function getPostSlugs(): string[] {
  if (!fs.existsSync(postsDirectory)) return [];
  return fs
    .readdirSync(postsDirectory)
    .filter((file) => file.endsWith(".md"))
    .map((file) => file.replace(/\.md$/, ""));
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const fullPath = path.join(postsDirectory, `${slug}.md`);
  if (!fs.existsSync(fullPath)) return null;

  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);
  const contentHtml = await marked(content, { async: true });

  return {
    slug,
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    date: parseDate(data.date),
    author: String(data.author ?? "Equipo OpoAlerta"),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    contentHtml,
  };
}

export async function getAllPosts(): Promise<Post[]> {
  const slugs = getPostSlugs();
  const posts = await Promise.all(slugs.map((slug) => getPostBySlug(slug)));
  return posts
    .filter((post): post is Post => post !== null)
    .sort((a, b) => b.date.localeCompare(a.date));
}
