import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  BLOG_CATEGORIES,
  categoryLabel,
  formatDate,
  getAllPosts,
  getPostsByCategory,
} from "@/lib/blog";
import "../../blog.css";

export const revalidate = 3600;

export async function generateStaticParams() {
  return BLOG_CATEGORIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const cat = BLOG_CATEGORIES.find((c) => c.slug === params.slug);
  if (!cat) return { title: "Danh mục không tồn tại" };
  return {
    title: `${cat.label} — Blog FormatBox`,
    description: cat.description,
  };
}

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const cat = BLOG_CATEGORIES.find((c) => c.slug === params.slug);
  if (!cat) notFound();
  const [posts, allPosts] = await Promise.all([getPostsByCategory(params.slug), getAllPosts()]);

  return (
    <div className="blog-wrap">
      <Link href="/blog" className="blog-article-back">
        ← Về danh sách
      </Link>

      <section className="blog-hero">
        <div>
          <span className="blog-hero-tag">Chủ đề</span>
          <h1>{cat.label}</h1>
          <p>{cat.description}</p>
        </div>
      </section>

      <nav className="blog-cat-bar">
        <Link href="/blog" className="blog-cat-chip">
          Tất cả ({allPosts.length})
        </Link>
        {BLOG_CATEGORIES.map((c) => (
          <Link
            key={c.slug}
            href={`/blog/category/${c.slug}`}
            className={`blog-cat-chip${c.slug === cat.slug ? " is-active" : ""}`}
          >
            {c.label} ({allPosts.filter((p) => p.category === c.slug).length})
          </Link>
        ))}
      </nav>

      <div className="blog-all-head">
        <h2>{cat.label}</h2>
        <span>{posts.length} bài</span>
      </div>

      {posts.length === 0 ? (
        <p style={{ color: "var(--dim)", padding: "20px 0" }}>Chưa có bài viết trong chủ đề này.</p>
      ) : (
        <div className="blog-grid">
          {posts.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="blog-card">
              <div className="blog-card-cover">{categoryLabel(p.category)}</div>
              <div className="blog-card-body">
                <span className="blog-card-tag">{categoryLabel(p.category)}</span>
                <h3>{p.title}</h3>
                <p>{p.excerpt}</p>
                <div className="blog-card-meta">
                  <span>{p.readingMinutes} phút đọc</span>
                  <span>·</span>
                  <span>{formatDate(p.publishedAt)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
