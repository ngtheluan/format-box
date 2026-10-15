"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { IconClock, IconCalendar } from "@tabler/icons-react";
import { DEFAULT_CATEGORIES, formatDateVi, type BlogCategoryMap, type BlogPost } from "@/lib/blog";
import { BlogCover } from "@/components/BlogCover";

export function BlogList({
  posts: all,
  categories,
}: {
  posts: BlogPost[];
  categories?: BlogCategoryMap;
}) {
  const [active, setActive] = useState<string | null>(null);
  const catMap = categories && Object.keys(categories).length ? categories : DEFAULT_CATEGORIES;

  const counts = useMemo(
    () =>
      all.reduce<Record<string, number>>((acc, p) => {
        acc[p.category] = (acc[p.category] || 0) + 1;
        return acc;
      }, {}),
    [all],
  );

  const posts = useMemo(
    () => (active ? all.filter((p) => p.category === active) : all),
    [all, active],
  );

  return (
    <>
      <div className="blog-cats" aria-label="Danh mục">
        <button
          type="button"
          onClick={() => setActive(null)}
          className={`blog-cat${!active ? " is-active" : ""}`}
        >
          Tất cả <span className="blog-cat-count">{all.length}</span>
        </button>
        {Object.entries(catMap)
          .filter(([key]) => (counts[key] || 0) > 0)
          .map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActive(key)}
              className={`blog-cat${active === key ? " is-active" : ""}`}
            >
              {label} <span className="blog-cat-count">{counts[key] || 0}</span>
            </button>
          ))}
      </div>

      {posts.length === 0 ? (
        <div
          style={{
            padding: 48,
            textAlign: "center",
            color: "var(--dim)",
            background: "var(--bg2)",
            border: "1px solid var(--border)",
            borderRadius: 14,
          }}
        >
          Chưa có bài nào trong danh mục này.
        </div>
      ) : (
        <div className="blog-grid">
          {posts.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="blog-card">
              <div className="blog-card-media">
                <BlogCover post={p} />
              </div>
              <div className="blog-card-body">
                <div className="blog-card-meta">
                  <span className="blog-chip">{catMap[p.category] || p.category}</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <IconCalendar size={13} stroke={1.8} /> {formatDateVi(p.date)}
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <IconClock size={13} stroke={1.8} /> {p.readMin} phút đọc
                  </span>
                </div>
                <h3>{p.title}</h3>
                <p>{p.excerpt}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
