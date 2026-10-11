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

const CAT_GLYPH: Record<string, string> = {
  web: "{ }",
  backend: "DB",
  ai: "AI",
  devops: "λ",
};

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
    <div className="blog-root">
      <div className="mx">
        <Link href="/blog" className="b-back">
          ← Về danh sách
        </Link>

        <section className="b-hero" style={{ marginTop: 20 }}>
          <div>
            <span className="b-hero-eyebrow">Chủ đề</span>
            <h1>{cat.label}</h1>
            <p className="lead">{cat.description}</p>
          </div>
          <div style={{ display: "grid", placeItems: "center" }}>
            <div
              style={{
                width: 220,
                height: 220,
                borderRadius: 24,
                overflow: "hidden",
                boxShadow: "var(--shadow)",
              }}
            >
              <div className="cov" data-cat={cat.slug}>
                <div className="glyph" style={{ fontSize: 96 }}>
                  {CAT_GLYPH[cat.slug] ?? "·"}
                </div>
              </div>
            </div>
          </div>
        </section>

        <nav className="b-chips">
          <Link href="/blog" className="b-chip">
            Tất cả <span className="n">({allPosts.length})</span>
          </Link>
          {BLOG_CATEGORIES.map((c) => {
            const n = allPosts.filter((p) => p.category === c.slug).length;
            return (
              <Link
                key={c.slug}
                href={`/blog/category/${c.slug}`}
                className={`b-chip${c.slug === cat.slug ? " is-active" : ""}`}
              >
                {c.label} <span className="n">({n})</span>
              </Link>
            );
          })}
        </nav>

        <div className="b-all-head">
          <h2>
            {cat.label} <span className="n">({posts.length})</span>
          </h2>
        </div>

        {posts.length === 0 ? (
          <p style={{ color: "var(--dim)", padding: "40px 0" }}>Chưa có bài viết trong chủ đề này.</p>
        ) : (
          <div className="b-grid">
            {posts.map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="b-card">
                <div className="b-card-cover">
                  <div className="cov" data-cat={p.category}>
                    <div className="glyph">{CAT_GLYPH[p.category] ?? "·"}</div>
                  </div>
                  <span className="pill">{categoryLabel(p.category)}</span>
                </div>
                <div className="b-card-body">
                  <h3>{p.title}</h3>
                  <p>{p.excerpt}</p>
                  <div className="b-card-meta">
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
    </div>
  );
}
