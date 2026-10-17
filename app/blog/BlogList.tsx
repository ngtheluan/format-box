"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  IconArrowRight,
  IconArticle,
  IconPinFilled,
  IconCalendar,
  IconClock,
  IconSearch,
  IconSparkles,
  IconX,
} from "@tabler/icons-react";
import { DEFAULT_CATEGORIES, formatDateVi, type BlogCategoryMap, type BlogPost } from "@/lib/blog";
import { BlogCard } from "@/components/BlogCard";
import { BlogCover } from "@/components/BlogCover";
import { useI18n } from "@/lib/i18n";

const PAGE = 12;

function norm(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d");
}

export function BlogList({
  posts: all,
  categories,
}: {
  posts: BlogPost[];
  categories?: BlogCategoryMap;
}) {
  const { t } = useI18n();
  const [active, setActive] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const searchRef = useRef<HTMLInputElement>(null);
  const catMap = categories && Object.keys(categories).length ? categories : DEFAULT_CATEGORIES;
  const catLabel = (k: string) => catMap[k] || k;
  const readLabel = t("blog_read_min");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const counts = useMemo(
    () =>
      all.reduce<Record<string, number>>((acc, p) => {
        acc[p.category] = (acc[p.category] || 0) + 1;
        return acc;
      }, {}),
    [all],
  );
  const topics = Object.keys(catMap).filter((k) => counts[k]);

  const filtered = useMemo(() => {
    const needle = norm(q.trim());
    return all.filter((p) => {
      if (active && p.category !== active) return false;
      if (!needle) return true;
      return norm(`${p.title} ${p.excerpt} ${p.tags.join(" ")} ${catMap[p.category] || ""}`).includes(needle);
    });
  }, [all, active, q, catMap]);

  // Featured = pinned posts of the current filter; if none, fall back to the latest.
  // Multiple pinned posts rotate in a slider at the top.
  const pinned = filtered.filter((p) => p.pinned);
  const featured = pinned.length ? pinned : filtered.length ? [filtered[0]] : [];
  const featuredSlugs = new Set(featured.map((p) => p.slug));
  const rest = filtered.filter((p) => !featuredSlugs.has(p.slug));
  const shown = rest.slice(0, limit);
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    if (featured.length < 2) return;
    const id = setInterval(() => setSlide((n) => (n + 1) % featured.length), 10000);
    return () => clearInterval(id);
  }, [featured.length]);
  // Clamp slide when filter changes.
  useEffect(() => {
    if (slide >= featured.length) setSlide(0);
  }, [featured.length, slide]);

  function pickCat(k: string | null) {
    setActive(k);
    setLimit(PAGE);
  }

  return (
    <>
      {/* HERO: airy, centered, with soft aurora blobs behind */}
      <section className="bh" aria-labelledby="blog-h1">
        <div className="bh-aurora" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <h1 id="blog-h1" className="bh-title">
          {t("blog_hero_1")}{" "}
          <span className="bh-grad">{t("blog_hero_2")}</span>
        </h1>
        <p className="bh-dek">{t("blog_hero_d")}</p>
      </section>

      {/* FEATURED: pinned posts rotate in a slider; else the latest post stands alone. */}
      {featured.length > 0 && (
        <div className="bh-featured-wrap">
          <div
            className="bh-featured-track"
            style={{ transform: `translateX(-${slide * 100}%)` }}
          >
            {featured.map((p) => (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                prefetch={false}
                className="bh-featured"
                aria-label={p.title}
              >
                <div className="bh-featured-text">
                  <span className="bh-featured-cat">
                    {p.pinned && <IconPinFilled size={11} stroke={2} />}
                    <IconSparkles size={11} stroke={2.2} /> {catLabel(p.category)}
                  </span>
                  <h2>{p.title}</h2>
                  {p.excerpt && <p>{p.excerpt}</p>}
                  <div className="bh-featured-meta">
                    <span>
                      <IconCalendar size={12} stroke={2} /> {formatDateVi(p.date)}
                    </span>
                    <span className="bh-dot" />
                    <span>
                      <IconClock size={12} stroke={2} /> {p.readMin} {readLabel}
                    </span>
                  </div>
                  <span className="bh-featured-cta">
                    Đọc bài <IconArrowRight size={14} stroke={2} />
                  </span>
                </div>
                <div className="bh-featured-media">
                  <BlogCover post={p} variant="hero" size={[1200, 800]} />
                </div>
              </Link>
            ))}
          </div>
          {featured.length > 1 && (
            <div className="bh-featured-dots" role="tablist" aria-label="Slider">
              {featured.map((p, i) => (
                <button
                  key={p.slug}
                  type="button"
                  role="tab"
                  aria-selected={i === slide}
                  aria-label={`Slide ${i + 1}`}
                  className={`bh-featured-dot${i === slide ? " is-on" : ""}`}
                  onClick={() => setSlide(i)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* FILTER BAR: sticky, holds tabs + search */}
      <div className="bh-bar">
        <div className="bh-tabs" role="tablist" aria-label={t("blog_topics")}>
          <button
            type="button"
            role="tab"
            aria-selected={!active}
            onClick={() => pickCat(null)}
            className={`bh-tab${!active ? " is-active" : ""}`}
          >
            {t("blog_all")}
            <span className="bh-tab-n">{all.length}</span>
          </button>
          {topics.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active === key}
              onClick={() => pickCat(active === key ? null : key)}
              className={`bh-tab${active === key ? " is-active" : ""}`}
            >
              {catMap[key]}
              <span className="bh-tab-n">{counts[key]}</span>
            </button>
          ))}
        </div>
        <label className="bh-search">
          <IconSearch size={16} stroke={2} />
          <input
            ref={searchRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setLimit(PAGE);
            }}
            placeholder={t("blog_search")}
            aria-label={t("blog_search")}
          />
          {q ? (
            <button type="button" onClick={() => setQ("")} aria-label={t("blog_clear")}>
              <IconX size={14} stroke={2} />
            </button>
          ) : (
            <kbd>/</kbd>
          )}
        </label>
      </div>

      {rest.length > 0 && (
        <div className="bh-section">
          <h3>
            <IconArticle size={16} stroke={2} />
            {active ? catMap[active] : q.trim() ? `Kết quả cho “${q.trim()}”` : "Bài viết khác"}
            <span>{rest.length} bài</span>
          </h3>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bl-empty">
          <span className="bl-empty-ico">
            <IconArticle size={22} stroke={1.7} />
          </span>
          <p>{t("blog_empty")}</p>
          <button
            type="button"
            className="bl-btn"
            onClick={() => {
              setQ("");
              pickCat(null);
            }}
          >
            {t("blog_clear")}
          </button>
        </div>
      ) : (
        <>
          <div className="bl-grid">
            {shown.map((p) => (
              <BlogCard key={p.slug} post={p} catLabel={catLabel(p.category)} readLabel={readLabel} />
            ))}
          </div>
          {rest.length > shown.length && (
            <div className="bl-more">
              <button type="button" className="bl-btn" onClick={() => setLimit((n) => n + PAGE)}>
                {t("blog_load_more")} <IconArrowRight size={14} stroke={2} />
                <span>+{Math.min(PAGE, rest.length - shown.length)}</span>
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
