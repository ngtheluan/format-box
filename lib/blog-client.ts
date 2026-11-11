"use client";
import { useEffect, useState } from "react";

export type BlogNavCategory = { slug: string; label: string };
export type BlogNavSeries = { slug: string; label: string; count: number; category: string };
export type BlogNavDyk = {
  slug: string;
  tag_vi: string;
  tag_en: string;
  title_vi: string;
  title_en: string;
};
export type BlogNavPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  categoryLabel: string;
  tags: string[];
  date: string;
  readMin: number;
};
export type BlogNavData = {
  categories: BlogNavCategory[];
  series: BlogNavSeries[];
  didYouKnow: BlogNavDyk[];
  posts: BlogNavPost[];
};

const EMPTY: BlogNavData = { categories: [], series: [], didYouKnow: [], posts: [] };

let cached: BlogNavData | null = null;
let pending: Promise<BlogNavData> | null = null;

async function fetchNav(): Promise<BlogNavData> {
  if (cached) return cached;
  if (pending) return pending;
  pending = fetch("/api/blog/nav", { cache: "force-cache" })
    .then((r) => (r.ok ? r.json() : EMPTY))
    .then((d) => {
      cached = { ...EMPTY, ...d } as BlogNavData;
      return cached;
    })
    .catch(() => EMPTY)
    .finally(() => {
      pending = null;
    });
  return pending;
}

export function useBlogNav(enabled: boolean): BlogNavData {
  const [data, setData] = useState<BlogNavData>(() => cached ?? EMPTY);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    fetchNav().then((d) => {
      if (alive) setData(d);
    });
    return () => {
      alive = false;
    };
  }, [enabled]);
  return data;
}
