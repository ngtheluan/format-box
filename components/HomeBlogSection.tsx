"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { IconArrowRight, IconArticle, IconCalendar, IconClock } from "@tabler/icons-react";
import { BlogCover } from "@/components/BlogCover";
import { BLOG_CATEGORIES, formatDateVi, type BlogPost } from "@/lib/blog";
import { useI18n } from "@/lib/i18n";

export default function HomeBlogSection() {
  const { t } = useI18n();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch("/api/blog/latest?limit=3")
      .then((r) => r.json())
      .then((j) => {
        if (alive) setPosts(j.posts || []);
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
            {[0, 1, 2].map((i) => (
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
                className="home-blog-card"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <div className="home-blog-media">
                  <BlogCover post={p} />
                  <span className="home-blog-chip">{BLOG_CATEGORIES[p.category]}</span>
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
          <Link href="/blog" className="home-blog-btn">
            <IconArticle size={16} stroke={1.9} />
            {t("sec_blog_cta")}
            <IconArrowRight size={14} stroke={2} />
          </Link>
        </div>
      </div>
    </section>
  );
}
