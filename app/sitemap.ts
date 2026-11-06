import type { MetadataRoute } from "next";
import { getTools } from "@/lib/tools";
import { isToolVisible } from "@/lib/tools-shared";
import {
  groupPostsBySeries,
  listPublicCategories,
  listPublicPosts,
  slugifyLabel,
} from "@/lib/blog";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://formatbox.site").replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [tools, posts, cats] = await Promise.all([
    getTools().then((xs) => xs.filter((t) => isToolVisible(t, "guest"))),
    listPublicPosts().catch(() => []),
    listPublicCategories().catch(() => []),
  ]);

  const latestByCat = new Map<string, Date>();
  for (const p of posts) {
    const d = p.date ? new Date(p.date) : now;
    const cur = latestByCat.get(p.category);
    if (!cur || d > cur) latestByCat.set(p.category, d);
  }

  const seriesGroups = groupPostsBySeries(posts);

  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/blog/series`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    ...tools.map((t) => ({
      url: `${SITE_URL}${t.href}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...posts.map((p) => ({
      url: `${SITE_URL}/blog/${p.slug}`,
      lastModified: p.date ? new Date(p.date) : now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...cats
      .filter((c) => latestByCat.has(c.slug))
      .map((c) => ({
        url: `${SITE_URL}/blog/tags/${slugifyLabel(c.label)}`,
        lastModified: latestByCat.get(c.slug) || now,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
    ...seriesGroups.map((g) => ({
      url: `${SITE_URL}/blog/series/${g.slug}`,
      lastModified: g.parts.reduce<Date>((acc, p) => {
        const d = p.date ? new Date(p.date) : now;
        return d > acc ? d : acc;
      }, new Date(0)),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
