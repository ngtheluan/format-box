import Link from "next/link";
import type { Metadata } from "next";
import { BLOG_CATEGORIES, categoryLabel, formatDate, getAllPosts } from "@/lib/blog";
import "./blog.css";

export const metadata: Metadata = {
  title: "Blog công nghệ — FormatBox",
  description: "Bài viết ngắn, thực tế về web, backend, AI và DevOps.",
};

export const revalidate = 3600;

export default async function BlogIndex() {
  const posts = await getAllPosts();
  const featured = posts.slice(0, 2);
  const latest = posts.slice(0, 5);
  const picks = posts.slice(2, 7);

  return (
    <div className="blog-wrap">
      <section className="blog-hero">
        <div>
          <span className="blog-hero-tag">Blog</span>
          <h1>Đọc để code tốt hơn.</h1>
          <p>Bài viết ngắn, thực tế về web, backend, AI và hạ tầng. Không marketing, không ngôn ngữ quảng cáo.</p>
        </div>
        <div className="blog-hero-feat">
          {featured.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`}>
              <span className="tag">Nổi bật</span>
              <h3>{p.title}</h3>
            </Link>
          ))}
        </div>
      </section>

      <nav className="blog-cat-bar" aria-label="Danh mục bài viết">
        <Link href="/blog" className="blog-cat-chip is-active">
          Tất cả ({posts.length})
        </Link>
        {BLOG_CATEGORIES.map((c) => {
          const count = posts.filter((p) => p.category === c.slug).length;
          return (
            <Link key={c.slug} href={`/blog/category/${c.slug}`} className="blog-cat-chip">
              {c.label} ({count})
            </Link>
          );
        })}
      </nav>

      <div className="blog-sections">
        <aside className="blog-section">
          <div className="blog-section-head">
            <h2>Xem theo chủ đề</h2>
            <span>{BLOG_CATEGORIES.length} nhóm</span>
          </div>
          <ul>
            {BLOG_CATEGORIES.map((c) => (
              <li key={c.slug}>
                <Link href={`/blog/category/${c.slug}`}>
                  <div className="t">{c.label}</div>
                  <div className="m">{c.description}</div>
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        <aside className="blog-section">
          <div className="blog-section-head">
            <h2>Mới cập nhật</h2>
            <span>Latest</span>
          </div>
          <ul>
            {latest.map((p) => (
              <li key={p.slug}>
                <Link href={`/blog/${p.slug}`}>
                  <div className="t">{p.title}</div>
                  <div className="m">
                    {p.readingMinutes} phút đọc · {formatDate(p.publishedAt)}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        <aside className="blog-section">
          <div className="blog-section-head">
            <h2>Nên đọc</h2>
            <span>Picks</span>
          </div>
          <ul>
            {picks.map((p) => (
              <li key={p.slug}>
                <Link href={`/blog/${p.slug}`}>
                  <div className="t">{p.title}</div>
                  <div className="m">{categoryLabel(p.category)}</div>
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <div className="blog-all-head">
        <h2>Tất cả bài viết</h2>
        <span>{posts.length} bài</span>
      </div>

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
    </div>
  );
}
