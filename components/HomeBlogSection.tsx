"use client";
import { BlogCover } from "@/components/BlogCover";
import { DEFAULT_CATEGORIES, formatDateVi, type BlogCategoryMap, type BlogPost } from "@/lib/blog";
import { useI18n } from "@/lib/i18n";
import { IconArrowRight, IconArticle, IconCalendar, IconClock } from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function HomeBlogSection() {
  const { t } = useI18n();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [cats, setCats] = useState<BlogCategoryMap>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch("/api/blog/latest?limit=4").then((r) => r.json()),
      fetch("/api/blog/categories").then((r) => r.json()),
    ])
      .then(([latestJ, catsJ]) => {
        if (!alive) return;
        setPosts(latestJ.posts || []);
        const rows: Array<{ slug: string; label: string }> = catsJ.categories || [];
        if (rows.length) {
          const m: BlogCategoryMap = {};
          for (const r of rows) m[r.slug] = r.label;
          setCats(m);
        }
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  if (!loading && posts.length === 0) return null;

  return (
    <section id="blog">
      <div className="mx">
        <div className="sh-wrap home-blog-head" data-reveal>
          <div className="stag">BLOG</div>
          <h2 className="sh">{t("sec_blog_h")}</h2>
          <p className="sd">{t("sec_blog_d")}</p>
        </div>

        {loading ? (
          <div className="home-blog-grid">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="home-blog-card is-skeleton" aria-hidden="true">
                <div className="home-blog-media" />
                <div className="home-blog-body">
                  <span className="sk sk-chip" />
                  <span className="sk sk-line" />
                  <span className="sk sk-line sk-short" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="home-blog-grid" data-reveal>
            {posts.map((p, i) => (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                prefetch={false}
                className="home-blog-card"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <div className="home-blog-media">
                  <BlogCover post={p} />
                  <span className="home-blog-chip">{cats[p.category] || p.category}</span>
                </div>
                <div className="home-blog-body">
                  <h3>{p.title}</h3>
                  <p>{p.excerpt}</p>
                  <div className="home-blog-meta">
                    <span>
                      <IconCalendar size={13} stroke={1.8} /> {formatDateVi(p.date)}
                    </span>
                    <span>
                      <IconClock size={13} stroke={1.8} /> {p.readMin} {t("blog_read_min")}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="home-blog-cta" data-reveal>
          <a href="/blog" target="_self" className="home-blog-btn">
            <IconArticle size={16} stroke={1.9} />
            {t("sec_blog_cta")}
            <IconArrowRight size={14} stroke={2} />
          </a>
        </div>
      </div>
    </section>
  );
}
