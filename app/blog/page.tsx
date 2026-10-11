import Link from "next/link";
import type { Metadata } from "next";
import { BLOG_CATEGORIES, categoryLabel, formatDate, getAllPosts } from "@/lib/blog";
import "./blog.css";

export const metadata: Metadata = {
  title: "Blog công nghệ — FormatBox",
  description: "Bài viết ngắn, thực tế về web, backend, AI và DevOps.",
};

export const revalidate = 3600;

const CAT_GLYPH: Record<string, string> = {
  web: "{ }",
  backend: "DB",
  ai: "AI",
  devops: "λ",
};

function coverGlyph(cat: string) {
  return CAT_GLYPH[cat] ?? "·";
}

export default async function BlogIndex() {
  const posts = await getAllPosts();
  const featured = posts.slice(0, 2);
  const latest = posts.slice(0, 5);
  const picks = posts.slice(2, 7);

  return (
    <div className="blog-root">
      <div className="mx">
        {/* HERO */}
        <section className="b-hero">
          <div>
            <span className="b-hero-eyebrow">Blog công nghệ</span>
            <h1>Đọc để code tốt hơn.</h1>
            <p className="lead">
              Web, backend, AI và hạ tầng. Bài ngắn, thực tế, cập nhật thường xuyên — không marketing, không
              ngôn ngữ quảng cáo.
            </p>
            <form className="b-hero-search" action="/blog" method="get">
              <input name="q" placeholder="Tìm bài viết, công nghệ, framework..." />
              <button type="submit">Tìm</button>
            </form>
            <div className="b-hero-sug">
              Gợi ý nhanh:
              <Link href="/blog/category/web">Next.js</Link>·
              <Link href="/blog/category/backend">Postgres</Link>·
              <Link href="/blog/category/ai">LLM</Link>·
              <Link href="/blog/category/devops">Edge</Link>
            </div>
          </div>

          <div className="b-feat">
            {featured.map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`}>
                <div className="cover">
                  <div className="cov" data-cat={p.category}>
                    <div className="glyph">{coverGlyph(p.category)}</div>
                  </div>
                  <span className="pill">NỔI BẬT →</span>
                </div>
                <div className="meta">
                  <div className="k">{categoryLabel(p.category)}</div>
                  <h3>{p.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* CHIPS */}
        <nav className="b-chips" aria-label="Danh mục bài viết">
          <Link href="/blog" className="b-chip is-active">
            Tất cả <span className="n">({posts.length})</span>
          </Link>
          {BLOG_CATEGORIES.map((c) => {
            const count = posts.filter((p) => p.category === c.slug).length;
            return (
              <Link key={c.slug} href={`/blog/category/${c.slug}`} className="b-chip">
                {c.label} <span className="n">({count})</span>
              </Link>
            );
          })}
        </nav>

        {/* 3-COLUMN DIGEST */}
        <div className="b-digest">
          <aside className="b-col is-web">
            <div className="b-col-head">
              <div className="icon">◎</div>
              <h2>
                Xem theo chủ đề
                <small>Chọn chủ đề bạn quan tâm</small>
              </h2>
              <span className="badge">{BLOG_CATEGORIES.length} nhóm</span>
            </div>
            <ul>
              {BLOG_CATEGORIES.map((c) => {
                const n = posts.filter((p) => p.category === c.slug).length;
                return (
                  <li key={c.slug}>
                    <Link href={`/blog/category/${c.slug}`}>
                      <div className="thumb" data-cat={c.slug}>
                        {coverGlyph(c.slug)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="t">{c.label}</div>
                        <div className="m">{n} bài viết</div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="b-col-foot">
              <Link href="/blog">Xem tất cả bài →</Link>
            </div>
          </aside>

          <aside className="b-col is-new">
            <div className="b-col-head">
              <div className="icon">◐</div>
              <h2>
                Mới cập nhật
                <small>Những bài mới nhất, vừa lên sóng</small>
              </h2>
              <span className="badge">Mới nhất</span>
            </div>
            <ul>
              {latest.map((p) => (
                <li key={p.slug}>
                  <Link href={`/blog/${p.slug}`}>
                    <div className="thumb" data-cat={p.category}>
                      {coverGlyph(p.category)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="t">{p.title}</div>
                      <div className="m">
                        {p.readingMinutes} phút đọc · {formatDate(p.publishedAt)}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="b-col-foot">
              <Link href="/blog">Xem thêm bài mới →</Link>
            </div>
          </aside>

          <aside className="b-col is-pick">
            <div className="b-col-head">
              <div className="icon">✦</div>
              <h2>
                Nên đọc
                <small>Chọn sẵn vài bài đáng đọc</small>
              </h2>
              <span className="badge">Đề xuất</span>
            </div>
            <ul>
              {picks.map((p) => (
                <li key={p.slug}>
                  <Link href={`/blog/${p.slug}`}>
                    <div className="thumb" data-cat={p.category}>
                      {coverGlyph(p.category)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="t">{p.title}</div>
                      <div className="m">
                        {p.readingMinutes} phút · {categoryLabel(p.category)}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="b-col-foot">
              <Link href="/blog">Xem tất cả bài →</Link>
            </div>
          </aside>
        </div>

        {/* TRUST BAR */}
        <div className="b-trust">
          <span>Thông tin được chọn lọc</span>
          <span>Thực tế &amp; dễ áp dụng</span>
          <span>Cập nhật thường xuyên</span>
          <span>Hoàn toàn miễn phí</span>
        </div>

        {/* ALL POSTS */}
        <div className="b-all-head">
          <h2>
            Tất cả bài viết <span className="n">({posts.length})</span>
          </h2>
          <span className="filter">⚑ Lọc</span>
        </div>

        <div className="b-grid">
          {posts.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="b-card">
              <div className="b-card-cover">
                <div className="cov" data-cat={p.category}>
                  <div className="glyph">{coverGlyph(p.category)}</div>
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
      </div>
    </div>
  );
}
