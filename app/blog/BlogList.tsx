"use client";

import { BlogCard, Corners } from "@/components/BlogCard";
import { BlogCover } from "@/components/BlogCover";
import { Stack } from "@/components/ui";
import { DEFAULT_CATEGORIES, formatDateVi, type BlogCategoryMap, type BlogPost } from "@/lib/blog";
import { useI18n } from "@/lib/i18n";
import { IconArrowRight, IconArticle, IconX } from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DidYouKnow } from "./DidYouKnow";

const PAGE = 12;
const SIDE = 4; // recent posts shown beside the featured story

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function BlogList({ posts: all, categories }: { posts: BlogPost[]; categories?: BlogCategoryMap }) {
  const { t } = useI18n();
  const [active, setActive] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const catMap = categories && Object.keys(categories).length ? categories : DEFAULT_CATEGORIES;
  const catLabel = (k: string) => catMap[k] || k;
  const readLabel = t("blog_read_min");

  const counts = useMemo(
    () =>
      all.reduce<Record<string, number>>((acc, p) => {
        acc[p.category] = (acc[p.category] || 0) + 1;
        return acc;
      }, {}),
    [all],
  );
  const topics = Object.keys(catMap).filter((k) => counts[k]);

  const filtered = useMemo(() => (active ? all.filter((p) => p.category === active) : all), [all, active]);

  // Featured split is independent of the topic filter: pinned posts fill it
  // (first = hero, the rest beside it); with nothing pinned, fall back to the latest posts.
  const pinned = all.filter((p) => p.pinned);
  const hero = pinned[0] ?? null;
  const side = pinned.slice(1, 1 + SIDE);
  // The grid skips featured posts on the default view; a topic view lists every post in it.
  const usedSlugs = new Set<string>(!active && hero ? [hero.slug, ...side.map((p) => p.slug)] : []);
  const rest = filtered.filter((p) => !usedSlugs.has(p.slug));
  const shown = rest.slice(0, limit);

  function pickCat(k: string | null) {
    setActive(k);
    setLimit(PAGE);
  }

  const secLabel = active ? catMap[active] : t("blog_latest");

  return (
    <Stack gap={28}>
      {/* HERO — framed tile: eyebrow, title, dek, topic filters */}
      <header className="bz-hero" aria-labelledby="blog-h1">
        <Corners />
        <span className="bz-eyebrow">{t("blog_eyebrow")}</span>
        <h1 id="blog-h1" className="bz-title">
          {t("blog_hero_1")} {t("blog_hero_2")}
        </h1>
        <p className="bz-dek">{t("blog_hero_d")}</p>
      </header>

      {/* FEATURED SPLIT — big story (7) + side list (5); unaffected by the topic filter */}
      {hero && (
        <div className={`bz-top${side.length ? "" : " bz-top--solo"}`} aria-label={t("blog_featured")}>
          <article className="bz-tile bz-feat">
            <Corners />
            <Link href={`/blog/${hero.slug}`} prefetch={false} className="bz-feat-link">
              <span className="bz-media">
                <BlogCover post={hero} variant="hero" size={[1200, 675]} />
              </span>
              <span className="bz-feat-body">
                <span className="bz-feat-cats">
                  <span className="bz-cat">{catLabel(hero.category)}</span>
                  {hero.tags.length > 0 && <span className="bz-tags">{hero.tags.slice(0, 3).join(" · ")}</span>}
                </span>
                <h2>{hero.title}</h2>
                {hero.excerpt && <span className="bz-excerpt">{hero.excerpt}</span>}
                <span className="bz-meta">
                  <time dateTime={hero.date}>{formatDateVi(hero.date)}</time>
                  <i aria-hidden="true">·</i>
                  <span>
                    {hero.readMin} {readLabel}
                  </span>
                </span>
                <span className="bz-byline">
                  <span className="bz-avatar">{initials(hero.author)}</span>
                  {hero.author}
                </span>
              </span>
            </Link>
          </article>

          {side.length > 0 && (
            <div className="bz-side">
              {side.map((p) => (
                <article key={p.slug} className="bz-tile bz-side-item">
                  <Corners />
                  <Link href={`/blog/${p.slug}`} prefetch={false}>
                    <span className="bz-media">
                      <BlogCover post={p} size={[480, 270]} />
                    </span>
                    <span className="bz-side-text">
                      <h2>{p.title}</h2>
                      {p.excerpt && <span className="bz-side-ex">{p.excerpt}</span>}
                      <time dateTime={p.date}>{formatDateVi(p.date)}</time>
                    </span>
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      <SavedPosts posts={all} />

      {/* LATEST GRID */}
      {rest.length > 0 || active ? (
        <section className="bz-sec">
          <header className="bz-sec-head">
            <h2>{secLabel}</h2>
            <nav className="bz-pills" role="tablist" aria-label={t("blog_topics")}>
              <button
                type="button"
                role="tab"
                aria-selected={!active}
                onClick={() => pickCat(null)}
                className={`bz-pill${!active ? " is-active" : ""}`}
              >
                {t("blog_all")}
              </button>
              {topics.map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active === key}
                  onClick={() => pickCat(active === key ? null : key)}
                  className={`bz-pill${active === key ? " is-active" : ""}`}
                >
                  {catMap[key]}
                </button>
              ))}
            </nav>
          </header>
          {filtered.length === 0 ? (
            <div className="bz-empty">
              <IconArticle size={22} stroke={1.7} />
              <p>{t("blog_empty")}</p>
              <button type="button" className="bz-btn" onClick={() => pickCat(null)}>
                {t("blog_clear")}
              </button>
            </div>
          ) : (
            <div className="bz-grid">
              {shown.map((p) => (
                <BlogCard key={p.slug} post={p} catLabel={catLabel(p.category)} readLabel={readLabel} />
              ))}
            </div>
          )}
          {rest.length > shown.length && (
            <div className="bz-more">
              <button type="button" className="bz-btn" onClick={() => setLimit((n) => n + PAGE)}>
                {t("blog_load_more")} <IconArrowRight size={14} stroke={2} />
              </button>
            </div>
          )}
        </section>
      ) : null}

      <DidYouKnow />
    </Stack>
  );
}

function SavedPosts({ posts }: { posts: BlogPost[] }) {
  const [slugs, setSlugs] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  const read = () => {
    try {
      const raw = localStorage.getItem("fb-blog-saved");
      const list: string[] = raw ? JSON.parse(raw) : [];
      setSlugs(Array.isArray(list) ? list : []);
    } catch {
      setSlugs([]);
    }
  };

  useEffect(() => {
    read();
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === "fb-blog-saved") read();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function remove(slug: string) {
    try {
      const next = slugs.filter((s) => s !== slug);
      localStorage.setItem("fb-blog-saved", JSON.stringify(next));
      setSlugs(next);
    } catch {}
  }

  if (!ready || slugs.length === 0) return null;
  const byId = new Map(posts.map((p) => [p.slug, p] as const));
  const items = slugs.map((s) => byId.get(s)).filter(Boolean) as BlogPost[];
  if (items.length === 0) return null;

  return (
    <section className="bz-sec bz-saved" aria-label="Bài viết đã lưu">
      <header className="bz-sec-head">
        <h2>Bài viết đã lưu</h2>
        <span className="bz-saved-count">{items.length}</span>
      </header>
      <ul className="bz-saved-list">
        {items.map((p) => (
          <li key={p.slug}>
            <Link href={`/blog/${p.slug}`} prefetch={false} className="bz-saved-link">
              <span className="bz-saved-title">{p.title}</span>
              <span className="bz-saved-meta">{formatDateVi(p.date)}</span>
            </Link>
            <button
              type="button"
              className="bz-saved-rm"
              onClick={() => remove(p.slug)}
              aria-label={`Bỏ lưu ${p.title}`}
              title="Bỏ lưu"
            >
              <IconX size={13} stroke={2} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
