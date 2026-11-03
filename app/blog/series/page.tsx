import type { Metadata } from "next";
import {
  categoriesToMap,
  groupPostsBySeries,
  listPublicCategories,
  listPublicPosts,
  listReactions,
} from "@/lib/blog";
import { SeriesCatalog } from "./SeriesCatalog";
import "../blog.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Chuỗi bài · FormatBox",
  description:
    "Tất cả chuỗi bài trên FormatBox Blog — những series được biên soạn theo thứ tự, đọc trọn từ phần 1 đến hết.",
};

export default async function BlogSeriesIndex() {
  const [posts, cats, popularity] = await Promise.all([
    listPublicPosts(),
    listPublicCategories(),
    listReactions(),
  ]);
  const catMap = categoriesToMap(cats);
  const groups = groupPostsBySeries(posts).map((g) => ({
    slug: g.slug,
    label: g.label,
    parts: g.parts,
    totalReadMin: g.parts.reduce((n, p) => n + (p.readMin || 0), 0),
    totalHelpful: g.parts.reduce((n, p) => n + (popularity?.[p.slug] ?? 0), 0),
    lastDate: g.parts.reduce((d, p) => (p.date > d ? p.date : d), g.parts[0]?.date || ""),
    categoryLabel: catMap[g.parts[0]?.category || ""] || g.parts[0]?.category || "",
  }));

  return (
    <div className="blog-wrap">
      <SeriesCatalog groups={groups} categoryMap={catMap} popularity={popularity} />
    </div>
  );
}
