import { NextResponse } from "next/server";
import { extractPricesFromArticle, type FuelHistory, type FuelHistoryPoint } from "@/lib/fuel";

export const revalidate = 21600; // 6h — history changes ~2x/month

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// VnExpress search — latest fuel price articles
const SEARCH_URL =
  "https://timkiem.vnexpress.net/?q=gi%C3%A1+x%C4%83ng&media_type=text&fromdate=0&todate=0&latest=on";

const MAX_ARTICLES = 12;

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

function extractPublishDate(html: string, url?: string): string | null {
  // 1) Prefer explicit meta tags
  const meta =
    /<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i.exec(html) ||
    /<meta[^>]+name=["']pubdate["'][^>]+content=["']([^"']+)["']/i.exec(html) ||
    /<meta[^>]+itemprop=["']datePublished["'][^>]+content=["']([^"']+)["']/i.exec(html);
  if (meta) {
    const d = new Date(meta[1]);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  // 2) URL pattern is most reliable for VnExpress fuel articles:
  //    /gia-xang-dau-moi-nhat-hom-nay-<day>-<month>-<id>.html
  if (url) {
    const m = /hom-nay-(\d{1,2})-(\d{1,2})-\d+\.html/i.exec(url);
    if (m) {
      const day = +m[1];
      const month = +m[2];
      const now = new Date();
      let year = now.getFullYear();
      // If URL month is later than current month + 1 (allow ~1 mo drift), it belongs to previous year
      if (month > now.getMonth() + 2) year -= 1;
      return new Date(Date.UTC(year, month - 1, day, 8, 0)).toISOString();
    }
  }
  // 3) Fallback: first "Thứ năm, 27/8/2026, 14:33 (GMT+7)" pattern in text
  const m = /(\d{1,2})\/(\d{1,2})\/(20\d{2})(?:,?\s*(\d{1,2}):(\d{2}))?/.exec(html);
  if (m) {
    const [, d, mo, y, hh = "8", mm = "0"] = m;
    return new Date(Date.UTC(+y, +mo - 1, +d, +hh - 7, +mm)).toISOString();
  }
  return null;
}

async function fetchSearchLinks(): Promise<string[]> {
  const res = await fetch(SEARCH_URL, {
    headers: { "User-Agent": UA, Accept: "text/html" },
    next: { revalidate: 21600 },
  });
  if (!res.ok) throw new Error(`Search HTTP ${res.status}`);
  const html = await res.text();
  const seen = new Set<string>();
  const links: string[] = [];
  const re = /https:\/\/vnexpress\.net\/(gia-xang-dau-moi-nhat-hom-nay-[a-z0-9-]{5,120})\.html/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const url = `https://vnexpress.net/${m[1]}.html`;
    if (!seen.has(url)) {
      seen.add(url);
      links.push(url);
    }
    if (links.length >= MAX_ARTICLES) break;
  }
  return links;
}

async function fetchOne(url: string): Promise<FuelHistoryPoint | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      next: { revalidate: 604800 }, // 7 days — an article's content doesn't change
    });
    if (!res.ok) return null;
    const html = await res.text();
    const dateIso = extractPublishDate(html, url);
    const text = stripHtml(html);
    const items = extractPricesFromArticle(text);
    if (!dateIso || items.length < 2) return null;
    return { date: dateIso, articleUrl: url, items };
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const links = await fetchSearchLinks();
    if (links.length === 0) throw new Error("Không tìm thấy bài giá xăng trong kết quả tìm kiếm");

    const results = await Promise.all(links.map(fetchOne));
    const points = results
      .filter((p): p is FuelHistoryPoint => p !== null)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (points.length < 2) throw new Error("Chỉ parse được rất ít bài — có thể VnExpress đã đổi format");

    const history: FuelHistory = {
      source: "vnexpress",
      fetchedAt: new Date().toISOString(),
      points,
    };
    return NextResponse.json(history, {
      headers: { "Cache-Control": "s-maxage=21600, stale-while-revalidate=604800" },
    });
  } catch (err) {
    return NextResponse.json(
      {
        source: "fallback",
        fetchedAt: new Date().toISOString(),
        points: [],
        note: `Không lấy được lịch sử (${err instanceof Error ? err.message : "unknown"}).`,
      } satisfies FuelHistory,
      { status: 200 },
    );
  }
}
