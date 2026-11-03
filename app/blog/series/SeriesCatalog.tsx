"use client";

import { Corners } from "@/components/BlogCard";
import type { BlogCategoryMap, BlogPost, SeriesGroup } from "@/lib/blog";
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

type Sort = "newest" | "most-parts" | "most-helpful" | "a-z";
type Filter = "all" | string;

const SORT_LABEL: Record<Sort, string> = {
  newest: "Mới nhất",
  "most-parts": "Nhiều phần nhất",
  "most-helpful": "Hữu ích nhất",
  "a-z": "A → Z",
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
  const [sort, setSort] = useState<Sort>("newest");
  const [filter, setFilter] = useState<Filter>("all");

  const availableCategories = useMemo(() => {
    const seen = new Set<string>();
    const list: { slug: string; label: string; count: number }[] = [];
    for (const g of groups) {
      const cat = g.parts[0]?.category;
      if (!cat || seen.has(cat)) continue;
      seen.add(cat);
      const count = groups.filter((x) => x.parts[0]?.category === cat).length;
      list.push({ slug: cat, label: categoryMap[cat] || cat, count });
    }
    return list;
  }, [groups, categoryMap]);

  const visible = useMemo(() => {
    let list = groups.slice();
    if (filter !== "all") list = list.filter((g) => g.parts[0]?.category === filter);
    switch (sort) {
      case "newest":
        list.sort((a, b) => (a.lastDate < b.lastDate ? 1 : a.lastDate > b.lastDate ? -1 : 0));
        break;
      case "most-parts":
        list.sort((a, b) => b.parts.length - a.parts.length);
        break;
      case "most-helpful":
        list.sort((a, b) => b.totalHelpful - a.totalHelpful);
        break;
      case "a-z":
        list.sort((a, b) => a.label.localeCompare(b.label, "vi"));
        break;
    }
    return list;
  }, [groups, filter, sort]);

  return (
    <>
      <header className="bz-hero bz-series-hero" aria-labelledby="series-index-h1">
        <Corners />
        <nav className="bz-crumb" aria-label="Breadcrumb">
          <Link href="/" prefetch={false}>FormatBox</Link>
          <i>/</i>
          <Link href="/blog" prefetch={false}>Blog</Link>
          <i>/</i>
          <span>Chuỗi bài</span>
        </nav>
        <span className="bz-eyebrow">
          <IconListNumbers size={14} stroke={2} /> Catalog
        </span>
        <h1 id="series-index-h1" className="bz-title">
          Tất cả chuỗi bài
        </h1>
        <p className="bz-dek">
          Những series được biên soạn theo thứ tự — đọc trọn từ phần 1 đến hết.
        </p>
      </header>

      <section className="bz-sec bz-series-catalog" aria-label="Danh sách chuỗi bài">
        <div className="bz-catalog-toolbar">
          <div className="bz-catalog-count">
            <b>{visible.length}</b> <span>kết quả</span>
          </div>
          <div className="bz-catalog-sort" role="tablist" aria-label="Sắp xếp">
            {(Object.keys(SORT_LABEL) as Sort[]).map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={sort === k}
                onClick={() => setSort(k)}
                className={`bz-catalog-sort-btn${sort === k ? " is-active" : ""}`}
              >
                {SORT_LABEL[k]}
              </button>
            ))}
          </div>
        </div>

        {availableCategories.length > 1 && (
          <nav className="bz-pills bz-catalog-filters" aria-label="Lọc theo chủ đề">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`bz-pill${filter === "all" ? " is-active" : ""}`}
            >
              Tất cả ({groups.length})
            </button>
            {availableCategories.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => setFilter(c.slug)}
                className={`bz-pill${filter === c.slug ? " is-active" : ""}`}
              >
                {c.label} ({c.count})
              </button>
            ))}
          </nav>
        )}

        {visible.length === 0 ? (
          <div className="bz-empty">
            <IconArticle size={22} stroke={1.7} />
            <p>Chưa có chuỗi bài phù hợp.</p>
          </div>
        ) : (
          <div className="bz-series-list">
            {visible.map((g) => (
              <SeriesCard
                key={g.slug}
                group={g}
                catLabel={g.categoryLabel}
                popularity={popularity}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
