import { listPublicPosts, parseCoverImage } from "@/lib/blog";

export const revalidate = 3600;

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://formatbox.site").replace(/\/$/, "");
const FEED_URL = `${SITE_URL}/blog/rss.xml`;
const BLOG_URL = `${SITE_URL}/blog`;
const FEED_TITLE = "FormatBox Blog";
const FEED_DESC =
  "Những bài viết bổ ích về công nghệ, AI, web, bảo mật và nhiều lĩnh vực khác — FormatBox Blog.";
const ITEM_LIMIT = 20;

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cdata(s: string): string {
  return `<![CDATA[${s.replace(/\]\]>/g, "]]]]><![CDATA[>")}]]>`;
}

function rfc822(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return new Date().toUTCString();
  return d.toUTCString();
}

export async function GET() {
  const posts = (await listPublicPosts().catch(() => [])).slice(0, ITEM_LIMIT);

  const latest = posts[0]?.date ? new Date(posts[0].date).toUTCString() : new Date().toUTCString();

  const items = posts.map((p) => {
    const url = `${SITE_URL}/blog/${p.slug}`;
    const cover = parseCoverImage(p.coverImage);
    const enclosure = cover?.src
      ? `<enclosure url="${xmlEscape(cover.src)}" type="image/jpeg" length="0" />`
      : "";
    const categories = [p.category, ...(p.tags || [])]
      .filter(Boolean)
      .map((c) => `<category>${xmlEscape(c)}</category>`)
      .join("");
    const contentHtml = `<p>${xmlEscape(p.excerpt || "")}</p><p><a href="${url}">Đọc tiếp trên FormatBox →</a></p>`;
    return `<item>
<title>${cdata(p.title)}</title>
<link>${url}</link>
<guid isPermaLink="true">${url}</guid>
<pubDate>${rfc822(p.date)}</pubDate>
<author>noreply@formatbox.site (${xmlEscape(p.author)})</author>
${categories}
<description>${cdata(p.excerpt || "")}</description>
<content:encoded>${cdata(contentHtml)}</content:encoded>
${enclosure}
</item>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${xmlEscape(FEED_TITLE)}</title>
<link>${BLOG_URL}</link>
<atom:link href="${FEED_URL}" rel="self" type="application/rss+xml" />
<description>${xmlEscape(FEED_DESC)}</description>
<language>vi</language>
<lastBuildDate>${latest}</lastBuildDate>
<generator>FormatBox</generator>
${items.join("\n")}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
