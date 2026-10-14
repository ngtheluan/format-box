import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 86400; // 1 day — place photos rarely change

// Finds candidate photos for a place name. Openverse (CC-licensed, multi-source
// search) is the primary provider; Wikipedia page images is the fallback for
// well-known landmarks. Both are reachable from cloud IP ranges (unlike many
// scraped sources) and need no API key.

type PhotoResult = {
  id: string;
  url: string; // full-size image, routed through our proxy on the client
  thumb: string; // small preview for the picker grid
  title: string;
  source: string;
  license?: string;
};

const UA = "web:format-box:v1.0.0 (travel-planner)";

async function fromOpenverse(q: string): Promise<PhotoResult[]> {
  const url =
    `https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}` +
    `&page_size=12&mature=false&aspect_ratio=wide,square`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error(`openverse ${res.status}`);
  const j = (await res.json()) as {
    results?: Array<{
      id: string;
      title?: string;
      url?: string;
      thumbnail?: string;
      source?: string;
      license?: string;
    }>;
  };
  return (j.results ?? [])
    .filter((r) => r.url)
    .map((r) => ({
      id: r.id,
      url: r.url as string,
      thumb: r.thumbnail || (r.url as string),
      title: r.title || q,
      source: r.source || "openverse",
      license: r.license || undefined,
    }));
}

async function fromWikipedia(q: string): Promise<PhotoResult[]> {
  const url =
    `https://en.wikipedia.org/w/api.php?action=query&format=json` +
    `&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrlimit=10` +
    `&prop=pageimages&piprop=thumbnail|original&pithumbsize=600`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error(`wikipedia ${res.status}`);
  const j = (await res.json()) as {
    query?: {
      pages?: Record<
        string,
        {
          pageid: number;
          title: string;
          index?: number;
          thumbnail?: { source: string };
          original?: { source: string };
        }
      >;
    };
  };
  const pages = Object.values(j.query?.pages ?? {});
  return pages
    .filter((p) => p.thumbnail?.source)
    .sort((a, b) => (a.index ?? 999) - (b.index ?? 999))
    .map((p) => ({
      id: `wiki-${p.pageid}`,
      url: p.original?.source || (p.thumbnail as { source: string }).source,
      thumb: (p.thumbnail as { source: string }).source,
      title: p.title,
      source: "wikipedia",
      license: "CC / public domain",
    }));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().slice(0, 120);
  if (!q) return NextResponse.json({ results: [] });

  let results: PhotoResult[] = [];
  try {
    results = await fromOpenverse(q);
  } catch {
    /* fall through to Wikipedia */
  }
  if (results.length === 0) {
    try {
      results = await fromWikipedia(q);
    } catch {
      /* return empty below */
    }
  }

  return NextResponse.json(
    { results },
    { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } },
  );
}
