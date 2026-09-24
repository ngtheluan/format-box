import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminTokenEdge, ADMIN_COOKIE } from "@/lib/admin-auth-edge";
import { getActiveToolHrefs } from "@/lib/edge-config";
import { SEED_TOOLS } from "@/lib/tools-shared";

const TOOL_HREFS = new Set(SEED_TOOLS.map((t) => t.href));

/**
 * Resolve the set of active tool hrefs. Prefers Vercel Edge Config (near-zero
 * latency at the edge); falls back to the cached /api/tools route when Edge
 * Config is unavailable. Returns null if neither source can be read, so the
 * caller allows the request rather than locking users out.
 */
async function getActiveSet(req: NextRequest): Promise<Set<string> | null> {
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

export async function middleware(req: NextRequest) {
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
    const active = await getActiveSet(req);
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
