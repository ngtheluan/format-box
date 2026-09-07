import { NextResponse } from "next/server";
import { extractPricesFromArticle, FALLBACK_SNAPSHOT, type FuelSnapshot } from "@/lib/fuel";

export const revalidate = 3600;

const RSS_URL = "https://vnexpress.net/rss/kinh-doanh.rss";
const SEARCH_URL =
  "https://timkiem.vnexpress.net/?q=gi%C3%A1+x%C4%83ng&media_type=text&fromdate=0&todate=0&latest=on";
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
  // Only pick the VN price-adjustment cycle articles.
  // These have URL slug "gia-xang-dau-moi-nhat-hom-nay-<day>-<month>-<id>".
  // Filters out unrelated stories like "Iran sắp tăng giá xăng".
  return (
    items.find((it) => /gia-xang-dau-moi-nhat-hom-nay-\d+-\d+-\d+\.html/i.test(it.link)) ?? null
  );
}

async function findLatestArticle(): Promise<{ link: string; title?: string; pubDate?: string }> {
  // 1) Try RSS first (fast, fresh)
  try {
    const rssRes = await fetch(RSS_URL, {
      headers: { "User-Agent": UA, Accept: "application/rss+xml,text/xml" },
      next: { revalidate: 3600 },
    });
    if (rssRes.ok) {
      const article = pickFuelArticle(await rssRes.text());
      if (article) return article;
    }
  } catch {
    /* fall through */
  }
  // 2) Fallback: scrape search page (works even between cycles)
  const searchRes = await fetch(SEARCH_URL, {
    headers: { "User-Agent": UA, Accept: "text/html" },
    next: { revalidate: 3600 },
  });
  if (!searchRes.ok) throw new Error(`Search HTTP ${searchRes.status}`);
  const html = await searchRes.text();
  const m = /https:\/\/vnexpress\.net\/(gia-xang-dau-moi-nhat-hom-nay-[a-z0-9-]+)\.html/i.exec(html);
  if (!m) throw new Error("Không tìm thấy bài giá xăng nào");
  return { link: `https://vnexpress.net/${m[1]}.html` };
}

async function fetchLive(): Promise<FuelSnapshot> {
  const article = await findLatestArticle();

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
