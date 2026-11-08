"use client";

import { BlogCard, Corners } from "@/components/BlogCard";
import { BlogCover } from "@/components/BlogCover";
import { IconButton, Stack } from "@/components/ui";
import {
  DEFAULT_CATEGORIES,
  formatDateVi,
  groupPostsBySeries,
  MAX_PINNED,
  parseSeriesFromPost,
  PINNED_IN_CAROUSEL,
  slugifyLabel,
  type BlogCategoryMap,
  type BlogPost,
  type DidYouKnowItem,
  type SeriesGroup,
} from "@/lib/blog";
import { toggleSavedPost, useSavedSlugs } from "@/lib/blog-saved";
import { useI18n } from "@/lib/i18n";
import {
  IconArrowRight,
  IconArticle,
  IconBook,
  IconCircleFilled,
  IconClock,
  IconFlame,
  IconListNumbers,
  IconPlayerPlayFilled,
  IconSparkles,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DidYouKnow } from "./DidYouKnow";

const PAGE = 12;
const CAROUSEL_MS = 5000;

function PostBadges({ date, helpful }: { date: string; helpful: number }) {
  const ageDays = (Date.now() - new Date(date).getTime()) / 86400000;
  const isNew = Number.isFinite(ageDays) && ageDays >= 0 && ageDays <= 7;
  const isHot = helpful > 10;
  if (!isNew && !isHot) return null;
  return (
    <span className="bzc-badges" aria-hidden="true">
      {isNew && (
        <span className="bzc-badge is-new">
          <IconSparkles size={11} stroke={2.2} />
          Mới
        </span>
      )}
      {isHot && (
        <span className="bzc-badge is-hot" title={`${helpful} lượt đánh giá hữu ích`}>
          <IconFlame size={11} stroke={2.2} />
          Hữu ích
        </span>
      )}
    </span>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function FeaturedCarousel({
  posts,
  catLabel,
  readLabel,
  popularity,
}: {
  posts: BlogPost[];
  catLabel: (key: string) => string;
  readLabel: string;
  popularity?: Record<string, number>;
}) {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = posts.length;

  // Timeout keyed on `index` so picking a dot restarts the full interval.
  useEffect(() => {
    if (paused || count < 2) return;
    const id = setTimeout(() => setIndex((i) => (i + 1) % count), CAROUSEL_MS);
    return () => clearTimeout(id);
  }, [index, paused, count]);

  return (
    <article
      className="bz-tile bz-feat"
      onPointerEnter={(e) => e.pointerType === "mouse" && setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={(e) => e.target.matches(":focus-visible") && setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <Corners />
      <div className="bz-carousel">
        <div className="bz-carousel-track" style={{ transform: `translateX(-${index * 100}%)` }}>
          {posts.map((p, i) => (
            <Link
              key={p.slug}
              href={`/blog/${p.slug}`}
              prefetch={false}
              className="bz-feat-link"
              aria-hidden={i !== index}
              tabIndex={i === index ? undefined : -1}
            >
              <span className="bz-media">
                <BlogCover post={p} variant="hero" size={[1200, 675]} />
                <PostBadges date={p.date} helpful={popularity?.[p.slug] ?? 0} />
              </span>
              <span className="bz-feat-body">
                <span className="bz-feat-cats">
                  <span className="bz-cat">{catLabel(p.category)}</span>
                  {p.tags.length > 0 && <span className="bz-tags">{p.tags.slice(0, 3).join(" · ")}</span>}
                </span>
                <h2>{p.title}</h2>
                {p.excerpt && <span className="bz-excerpt">{p.excerpt}</span>}
                <span className="bz-meta">
                  <time dateTime={p.date}>{formatDateVi(p.date)}</time>
                  <i aria-hidden="true">·</i>
                  <span>
                    {p.readMin} {readLabel}
                  </span>
                </span>
                <span className="bz-byline">
                  <span className="bz-avatar">{initials(p.author)}</span>
                  {p.author}
                </span>
              </span>
            </Link>
          ))}
        </div>
        {count > 1 && (
          <div className="bz-carousel-dots">
            {posts.map((p, i) => (
              <IconButton
                key={p.slug}
                size="sm"
                round
                className={i === index ? "is-active" : undefined}
                aria-label={`${t("blog_carousel_goto")} ${i + 1}`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
              >
                <IconCircleFilled size={8} />
              </IconButton>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export function BlogList({
  posts: all,
  categories,
  didYouKnow,
  activeTag = null,
  popularity,
}: {
  posts: BlogPost[];
  categories?: BlogCategoryMap;
  didYouKnow?: DidYouKnowItem[];
  activeTag?: string | null;
  popularity?: Record<string, number>;
}) {
  const { t } = useI18n();
  const [active, setActive] = useState<string | null>(activeTag);
  const isTagPage = !!active;
  const [limit, setLimit] = useState(PAGE);
  const [q, setQ] = useState("");
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

  const filtered = useMemo(() => {
    const byCat = active ? all.filter((p) => p.category === active) : all;
    const needle = q.trim().toLowerCase();
    if (!needle) return byCat;
    return byCat.filter((p) => {
      const hay = [p.title, p.slug, p.excerpt || "", catLabel(p.category), ...(p.tags || [])].join(" ").toLowerCase();
      return hay.includes(needle);
    });
  }, [all, active, q, catMap]);

  // Featured split is independent of the topic filter.
  const pinned = all.filter((p) => p.pinned).slice(0, MAX_PINNED);
  const carousel = pinned.slice(0, PINNED_IN_CAROUSEL);
  const side = pinned.slice(PINNED_IN_CAROUSEL);
  // The grid skips featured posts on the default view; a topic view lists every post in it.
  const usedSlugs = new Set<string>(!active && !q.trim() ? pinned.map((p) => p.slug) : []);
  const rest = filtered.filter((p) => !usedSlugs.has(p.slug));
  const shown = rest.slice(0, limit);
  const hasMore = rest.length > shown.length;

  function pickCat(k: string | null) {
    setLimit(PAGE);
    setActive(k);
    const slug = k ? slugifyLabel(catLabel(k)) : "";
    const url = k ? `/blog/tags/${slug}` : "/blog";
    if (typeof window !== "undefined") {
      window.history.pushState(null, "", url);
      document.title = k ? `#${slug} · FormatBox` : "Bài viết · FormatBox";
      // pushState doesn't reset scroll like a real navigation. Jump instantly:
      // the global smooth scroll would animate across a list that is being swapped.
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }

  useEffect(() => {
    if (typeof document === "undefined") return;
    const want = active ? `#${slugifyLabel(catLabel(active))} · FormatBox` : "Bài viết · FormatBox";
    document.title = want;
    // Next App Router may reset <title> on URL change; keep ours sticky via observer.
    const headTitle = document.querySelector("head > title");
    if (!headTitle) return;
    const obs = new MutationObserver(() => {
      if (document.title !== want) document.title = want;
    });
    obs.observe(headTitle, { childList: true, characterData: true, subtree: true });
    return () => obs.disconnect();
  }, [active, catMap]);

  useEffect(() => {
    const onPop = () => {
      if (typeof window === "undefined") return;
      const m = window.location.pathname.match(/^\/blog\/tags\/([^/]+)/);
      if (!m) {
        setActive(null);
        return;
      }
      const slug = decodeURIComponent(m[1]);
      const key = catMap[slug] ? slug : Object.keys(catMap).find((k) => slugifyLabel(catMap[k]) === slug) || null;
      setActive(key);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [catMap]);

  // Reset visible window when switching categories or editing the search.
  useEffect(() => {
    setLimit(PAGE);
  }, [active, q]);

  const searching = !!q.trim();
  const secLabel = searching ? t("blog_search_results") : active ? catMap[active] : t("blog_all_sub");
  const secCount = searching ? filtered.length : active ? counts[active] : all.length;

  return (
    <Stack gap={28}>
      {/* HERO — framed tile: eyebrow, title, dek, topic filters */}
      <header className="bz-hero" aria-labelledby="blog-h1">
        <Corners />
        {isTagPage ? (
          <>
            <span className="bz-eyebrow">{t("blog_eyebrow")}</span>
            <h1 id="blog-h1" className="bz-title">
              {catLabel(active!)}
            </h1>
            <p className="bz-dek">
              Tổng hợp bài viết chia sẻ về chủ đề {catLabel(active!)} ({counts[active!] || 0})
            </p>
          </>
        ) : (
          <>
            <span className="bz-eyebrow">{t("blog_eyebrow")}</span>
            <h1 id="blog-h1" className="bz-title">
              {t("blog_hero_1")} {t("blog_hero_2")}
            </h1>
            <p className="bz-dek">{t("blog_hero_d")}</p>
          </>
        )}
      </header>

      {/* FEATURED SPLIT — big story (7) + side list (5); unaffected by the topic filter */}
      {!isTagPage && !q.trim() && carousel.length > 0 && (
        <div className={`bz-top${side.length ? "" : " bz-top--solo"}`} aria-label={t("blog_featured")}>
          <FeaturedCarousel posts={carousel} catLabel={catLabel} readLabel={readLabel} popularity={popularity} />

          {side.length > 0 && (
            <div className="bz-side">
              {side.map((p) => (
                <article key={p.slug} className="bz-tile bz-side-item">
                  <Corners />
                  <Link href={`/blog/${p.slug}`} prefetch={false}>
                    <span className="bz-media">
                      <BlogCover post={p} size={[480, 270]} />
                      <PostBadges date={p.date} helpful={popularity?.[p.slug] ?? 0} />
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

      {!isTagPage && !q.trim() && <SavedPosts posts={all} popularity={popularity} />}

      {/* LATEST GRID */}
      {rest.length > 0 || active || searching ? (
        <section className="bz-sec">
          <header className="bz-sec-head">
            <h2>
              {secLabel} ({secCount})
            </h2>
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
              <button
                type="button"
                className="bz-btn"
                onClick={() => {
                  setQ("");
                  pickCat(null);
                }}
              >
                {t("blog_clear")}
              </button>
            </div>
          ) : (
            <div className="bz-grid">
              {shown.map((p) => (
                <BlogCard
                  key={p.slug}
                  post={p}
                  catLabel={catLabel(p.category)}
                  readLabel={readLabel}
                  helpful={popularity?.[p.slug] ?? 0}
                  seriesSlug={parseSeriesFromPost(p)?.slug ?? null}
                />
              ))}
            </div>
          )}
          {hasMore && (
            <div className="bz-more">
              <button type="button" className="bz-btn" onClick={() => setLimit((n) => n + PAGE)}>
                {t("blog_load_more")} <IconArrowRight size={14} stroke={2} />
              </button>
            </div>
          )}
        </section>
      ) : null}

      {!isTagPage && !q.trim() && <SeriesSection posts={all} categories={catMap} popularity={popularity} />}

      {!isTagPage && <DidYouKnow items={didYouKnow} />}
    </Stack>
  );
}

const SERIES_PREVIEW_LIMIT = 3;

function SeriesSection({
  posts,
  categories,
  popularity,
}: {
  posts: BlogPost[];
  categories: BlogCategoryMap;
  popularity?: Record<string, number>;
}) {
  const { t } = useI18n();
  const groups = useMemo(() => groupPostsBySeries(posts).filter((g) => g.parts.length >= 1), [posts]);
  if (groups.length === 0) return null;
  const shown = groups.slice(0, SERIES_PREVIEW_LIMIT);
  const hasMore = groups.length > shown.length;
  return (
    <section className="bz-sec bz-series" aria-label={t("blog_series_title")}>
      <header className="bz-sec-head">
        <div>
          <h2>
            {t("blog_series_title")} ({groups.length})
          </h2>
          <p className="bz-series-sub">{t("blog_series_sub")}</p>
        </div>
      </header>
      <div className="bz-series-list">
        {shown.map((g) => (
          <SeriesCard
            key={g.slug}
            group={g}
            catLabel={categories[g.parts[0].category] || g.parts[0].category}
            popularity={popularity}
          />
        ))}
      </div>
      {hasMore && (
        <div className="bz-more">
          <Link href="/blog/series" prefetch={false} className="bz-btn">
            {t("blog_load_more")} <IconArrowRight size={14} stroke={2} />
          </Link>
        </div>
      )}
    </section>
  );
}

export function SeriesCard({
  group,
  catLabel,
  popularity,
}: {
  group: SeriesGroup;
  catLabel: string;
  popularity?: Record<string, number>;
}) {
  const { t } = useI18n();
  const head = group.parts[0];
  const countLabel = group.parts.length === 1 ? t("blog_series_count_one") : t("blog_series_count_many");
  const totalMin = group.parts.reduce((n, p) => n + (p.readMin || 0), 0);
  const totalHelpful = group.parts.reduce((n, p) => n + (popularity?.[p.slug] ?? 0), 0);
  return (
    <article className="bz-tile bz-series-card">
      <Corners />
      <Link href={`/blog/series/${encodeURIComponent(group.slug)}`} prefetch={false} className="bz-series-card-link">
        <span className="bz-series-cover">
          <BlogCover post={head} size={[640, 360]} />
          <span className="bz-series-badge">
            <IconListNumbers size={12} stroke={2.2} />
            Series
          </span>
        </span>
        <span className="bz-series-body">
          <span className="bz-series-cat">{catLabel}</span>
          <h3 className="bz-series-title">{group.label}</h3>
          <ul className="bz-series-meta">
            <li>
              <IconBook size={14} stroke={2} />
              <span>
                {group.parts.length} {countLabel}
              </span>
            </li>
            <li>
              <IconClock size={14} stroke={2} />
              <span>~{formatReadTime(totalMin)}</span>
            </li>
            {totalHelpful > 0 && (
              <li>
                <IconUsers size={14} stroke={2} />
                <span>{totalHelpful} hữu ích</span>
              </li>
            )}
            <li className="bz-series-meta-pills">
              <IconListNumbers size={14} stroke={2} />
              <span>Phần 1 → {group.parts.length}</span>
            </li>
          </ul>
          {head.excerpt && <p className="bz-series-ex">{head.excerpt}</p>}
        </span>
        <span className="bz-series-cta-slot">
          <span className="bz-series-cta-btn">
            <IconPlayerPlayFilled size={16} />
            Bắt đầu đọc
          </span>
        </span>
      </Link>
    </article>
  );
}

function formatReadTime(min: number): string {
  if (!Number.isFinite(min) || min <= 0) return "0p";
  if (min < 60) return `${min}p`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${m.toString().padStart(2, "0")}p` : `${h}h`;
}

function SavedPosts({ posts, popularity }: { posts: BlogPost[]; popularity?: Record<string, number> }) {
  const slugs = useSavedSlugs();

  if (slugs.length === 0) return null;
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
        {items.map((p) => {
          const now = Date.now();
          const published = new Date(p.date).getTime();
          const ageDays = Number.isFinite(published) ? (now - published) / 86400000 : Infinity;
          const isNew = ageDays >= 0 && ageDays <= 7;
          const helpful = popularity?.[p.slug] ?? 0;
          const isHot = helpful > 10;
          return (
            <li key={p.slug}>
              <Link href={`/blog/${p.slug}`} prefetch={false} className="bz-saved-link">
                <span className="bz-saved-title">{p.title}</span>
                <span className="bz-saved-meta">
                  {isNew && (
                    <span className="bz-saved-badge is-new" title="Đăng trong 7 ngày qua">
                      <i>Mới</i>
                    </span>
                  )}
                  {isHot && (
                    <span className="bz-saved-badge is-hot" title={`${helpful} lượt đánh giá hữu ích`}>
                      <IconFlame size={11} stroke={2} />
                      <i>Hữu ích</i>
                    </span>
                  )}
                  <span className="bz-saved-date">{formatDateVi(p.date)}</span>
                </span>
              </Link>
              <button
                type="button"
                className="bz-saved-rm"
                onClick={() => toggleSavedPost(p.slug)}
                aria-label={`Bỏ lưu ${p.title}`}
                title="Bỏ lưu"
              >
                <IconX size={13} stroke={2} />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
