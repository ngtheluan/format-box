import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { verifyAdminTokenEdge, ADMIN_COOKIE } from "@/lib/admin-auth-edge";
import { getActiveToolHrefs } from "@/lib/edge-config";
import { SEED_TOOLS } from "@/lib/tools-shared";

const TOOL_HREFS = new Set(SEED_TOOLS.map((t) => t.href));

// Edge isolates stay warm between requests, so keep the active set in memory
// and serve it stale-while-revalidate: navigation never waits on a network read
// once the isolate has seen one request.
const ACTIVE_TTL_MS = 60_000;
let activeCache: { set: Set<string> | null; at: number } | null = null;
let activeInflight: Promise<Set<string> | null> | null = null;

/**
 * Read the set of active tool hrefs. Prefers Vercel Edge Config (near-zero
 * latency at the edge); falls back to the cached /api/tools route when Edge
 * Config is unavailable. Returns null if neither source can be read, so the
 * caller allows the request rather than locking users out.
 */
async function fetchActiveSet(req: NextRequest): Promise<Set<string> | null> {
  const fromEdge = await getActiveToolHrefs();
  if (fromEdge) return new Set(fromEdge);
  try {
    const res = await fetch(new URL("/api/tools", req.url), {
      next: { revalidate: 60, tags: ["tools"] },
    });
    if (res.ok) {
      const { tools } = (await res.json()) as { tools: { href: string }[] };
      return new Set(tools.map((t) => t.href));
    }
  } catch {
    /* fall through */
  }
  return null;
}

function refreshActiveSet(req: NextRequest): Promise<Set<string> | null> {
  if (!activeInflight) {
    activeInflight = fetchActiveSet(req)
      .then((set) => {
        // Keep the last good set when a refresh fails.
        if (set || !activeCache) activeCache = { set, at: Date.now() };
        else activeCache.at = Date.now();
        return activeCache.set;
      })
      .finally(() => {
        activeInflight = null;
      });
  }
  return activeInflight;
}

async function getActiveSet(req: NextRequest, event: NextFetchEvent): Promise<Set<string> | null> {
  if (!activeCache) return refreshActiveSet(req);
  if (Date.now() - activeCache.at > ACTIVE_TTL_MS) event.waitUntil(refreshActiveSet(req));
  return activeCache.set;
}

export async function middleware(req: NextRequest, event: NextFetchEvent) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin") return NextResponse.next();
    const token = req.cookies.get(ADMIN_COOKIE)?.value;
    const ok = await verifyAdminTokenEdge(token, process.env.ADMIN_PASSWORD);
    if (ok) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  // Block access to tool pages that are toggled inactive in admin.
  if (TOOL_HREFS.has(pathname)) {
    const active = await getActiveSet(req, event);
    // Only rewrite when we positively know the tool is inactive. On read
    // failure (active === null) fall through and allow — don't lock users out.
    if (active && !active.has(pathname)) {
      const url = req.nextUrl.clone();
      url.pathname = "/forbidden";
      url.searchParams.set("from", pathname);
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/audio-studio",
    "/base64",
    "/bill",
    "/calendar",
    "/color",
    "/countdown",
    "/curl",
    "/exchange-currency",
    "/favicon-export",
    "/flappy-bird",
    "/fuel",
    "/gold",
    "/graph",
    "/image",
    "/json",
    "/jwt",
    "/license-plate",
    "/lucky-ticket",
    "/markdown",
    "/pacman",
    "/qr",
    "/responsive",
    "/speed-test",
    "/text-case",
    "/timestamp",
    "/typing-test",
    "/uuid",
    "/weather",
    "/wheel",
  ],
};
