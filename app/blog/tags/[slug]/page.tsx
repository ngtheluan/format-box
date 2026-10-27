import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { categoriesToMap, listPublicCategories, listPublicPosts, slugifyLabel } from "@/lib/blog";
import { BlogList } from "../../BlogList";
import "../../blog.css";

export const dynamic = "force-dynamic";

function resolveCat(map: Record<string, string>, slug: string): string | null {
  if (map[slug]) return slug;
  for (const [key, label] of Object.entries(map)) {
    if (slugifyLabel(label) === slug) return key;
  }
  return null;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const map = categoriesToMap(await listPublicCategories());
  const key = resolveCat(map, params.slug);
  if (!key) return { title: "Blog · FormatBox" };
  return {
    title: `#${slugifyLabel(map[key])} · FormatBox`,
    description: `Tất cả bài viết thuộc chủ đề ${map[key]} trên FormatBox Blog.`,
  };
}

export default async function BlogTagPage({ params }: { params: { slug: string } }) {
  const [posts, cats] = await Promise.all([listPublicPosts(), listPublicCategories()]);
  const map = categoriesToMap(cats);
  const key = resolveCat(map, params.slug);
  if (!key) notFound();

  return (
    <div className="blog-wrap">
      <BlogList posts={posts} categories={map} activeTag={key} />
    </div>
  );
}
