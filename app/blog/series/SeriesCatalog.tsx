"use client";

import { Corners } from "@/components/BlogCard";
import { Stack } from "@/components/ui";
import type { BlogCategoryMap, SeriesGroup } from "@/lib/blog";
import { useI18n } from "@/lib/i18n";
import { IconArticle, IconListNumbers } from "@tabler/icons-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { SeriesCard } from "../BlogList";

export type SeriesRow = SeriesGroup & {
  totalReadMin: number;
  totalHelpful: number;
  lastDate: string;
  categoryLabel: string;
};

export function SeriesCatalog({
  groups,
  categoryMap,
  popularity,
}: {
  groups: SeriesRow[];
  categoryMap: BlogCategoryMap;
  popularity?: Record<string, number>;
}) {
  const { t } = useI18n();
  const [active, setActive] = useState<string | null>(null);

  const topics = useMemo(() => {
    const seen = new Map<string, number>();
    for (const g of groups) {
      const cat = g.parts[0]?.category;
      if (!cat) continue;
      seen.set(cat, (seen.get(cat) || 0) + 1);
    }
    return Array.from(seen.entries()).map(([slug, count]) => ({
      slug,
      label: categoryMap[slug] || slug,
      count,
    }));
  }, [groups, categoryMap]);

  const visible = useMemo(() => {
    const list = active ? groups.filter((g) => g.parts[0]?.category === active) : groups.slice();
    list.sort((a, b) => (a.lastDate < b.lastDate ? 1 : a.lastDate > b.lastDate ? -1 : 0));
    return list;
  }, [groups, active]);

  const secLabel = active ? categoryMap[active] || active : t("blog_series_title");

  return (
    <Stack gap={28}>
      <header className="bz-hero" aria-labelledby="series-index-h1">
        <Corners />
        <nav className="bz-crumb" aria-label="Breadcrumb">
          <Link href="/" prefetch={false}>FormatBox</Link>
          <i>/</i>
          <Link href="/blog" prefetch={false}>Blog</Link>
          <i>/</i>
          <span>Series</span>
        </nav>
        <span className="bz-eyebrow">
          <IconListNumbers size={14} stroke={2} /> {t("blog_series_title")}
        </span>
        <h1 id="series-index-h1" className="bz-title">
          Tất cả Series Bài viết
        </h1>
        <p className="bz-dek">
          Những series được biên soạn theo thứ tự — đọc trọn từ phần 1 đến hết.
        </p>
      </header>

      <section className="bz-sec" aria-label={secLabel}>
        <header className="bz-sec-head">
          <h2>
            {secLabel} ({visible.length})
          </h2>
          {topics.length > 1 && (
            <nav className="bz-pills" role="tablist" aria-label={t("blog_topics")}>
              <button
                type="button"
                role="tab"
                aria-selected={!active}
                onClick={() => setActive(null)}
                className={`bz-pill${!active ? " is-active" : ""}`}
              >
                {t("blog_all")} ({groups.length})
              </button>
              {topics.map((c) => (
                <button
                  key={c.slug}
                  type="button"
                  role="tab"
                  aria-selected={active === c.slug}
                  onClick={() => setActive(active === c.slug ? null : c.slug)}
                  className={`bz-pill${active === c.slug ? " is-active" : ""}`}
                >
                  {c.label} ({c.count})
                </button>
              ))}
            </nav>
          )}
        </header>

        {visible.length === 0 ? (
          <div className="bz-empty">
            <IconArticle size={22} stroke={1.7} />
            <p>Chưa có Series Bài viết phù hợp.</p>
          </div>
        ) : (
          <div className="bz-series-list">
            {visible.map((g) => (
              <SeriesCard key={g.slug} group={g} catLabel={g.categoryLabel} popularity={popularity} />
            ))}
          </div>
        )}
      </section>
    </Stack>
  );
}

