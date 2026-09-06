import { NextResponse } from "next/server";
import { extractPricesFromArticle, FALLBACK_SNAPSHOT, type FuelSnapshot } from "@/lib/fuel";

export const revalidate = 3600;

const RSS_URL = "https://vnexpress.net/rss/kinh-doanh.rss";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function pickFuelArticle(rss: string): { link: string; title: string; pubDate?: string } | null {
  // Each <item> has <title>, <link>, optional <pubDate>
  const items: { title: string; link: string; pubDate?: string }[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(rss)) !== null) {
    const body = m[1];
    const title = /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i.exec(body)?.[1]?.trim();
    const link = /<link>([\s\S]*?)<\/link>/i.exec(body)?.[1]?.trim();
    const pubDate = /<pubDate>([\s\S]*?)<\/pubDate>/i.exec(body)?.[1]?.trim();
    if (title && link) items.push({ title, link, pubDate });
  }
  // First title mentioning 'giá xăng' or 'giá xăng dầu'
  return items.find((it) => /giá\s+xăng/i.test(it.title)) ?? null;
}

async function fetchLive(): Promise<FuelSnapshot> {
  const rssRes = await fetch(RSS_URL, {
    headers: { "User-Agent": UA, Accept: "application/rss+xml,text/xml" },
    next: { revalidate: 3600 },
  });
  if (!rssRes.ok) throw new Error(`RSS HTTP ${rssRes.status}`);
  const rss = await rssRes.text();
  const article = pickFuelArticle(rss);
  if (!article) throw new Error("Không tìm thấy bài giá xăng trong RSS");

  const artRes = await fetch(article.link, {
    headers: { "User-Agent": UA, Accept: "text/html" },
    next: { revalidate: 3600 },
  });
  if (!artRes.ok) throw new Error(`Article HTTP ${artRes.status}`);
  const html = await artRes.text();
  const text = stripHtml(html);
  const items = extractPricesFromArticle(text);
  if (items.length < 2) throw new Error("Parse được quá ít giá — có thể format bài đã đổi");

  return {
    source: "vnexpress",
    articleUrl: article.link,
    articleTitle: article.title,
    publishedAt: article.pubDate ? new Date(article.pubDate).toISOString() : undefined,
    fetchedAt: new Date().toISOString(),
    items,
  };
}

export async function GET() {
  try {
    const snap = await fetchLive();
    return NextResponse.json(snap, {
      headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (err) {
    return NextResponse.json(
      {
        ...FALLBACK_SNAPSHOT,
        note: `Không lấy được dữ liệu live (${err instanceof Error ? err.message : "unknown"}). Hiển thị dữ liệu dự phòng.`,
      },
      { status: 200 },
    );
  }
}
