import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { SEED_TOOLS } from "@/lib/tools-shared";
import { USER_COOKIE, verifyUserTokenEdge, type UserRole } from "@/lib/user-auth-edge";

const TOOL_HREFS = new Set(SEED_TOOLS.map((t) => t.href));

type Visibility = { active: Set<string>; guest: Set<string>; user: Set<string> };

const VIS_TTL_MS = 60_000;
let visCache: { v: Visibility | null; at: number } | null = null;
let visInflight: Promise<Visibility | null> | null = null;

async function fetchVisibility(req: NextRequest): Promise<Visibility | null> {
  try {
    const res = await fetch(new URL("/api/tools/visibility", req.url), {
      next: { revalidate: 60, tags: ["tools"] },
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { active: string[]; guest: string[]; user: string[] };
    return {
      active: new Set(j.active),
      guest: new Set(j.guest),
      user: new Set(j.user),
    };
  } catch {
    return null;
  }
}

function refreshVisibility(req: NextRequest): Promise<Visibility | null> {
  if (!visInflight) {
    visInflight = fetchVisibility(req)
      .then((v) => {
        if (v || !visCache) visCache = { v, at: Date.now() };
        else visCache.at = Date.now();
        return visCache.v;
      })
      .finally(() => {
        visInflight = null;
      });
  }
  return visInflight;
}

async function getVisibility(req: NextRequest, event: NextFetchEvent): Promise<Visibility | null> {
  if (!visCache) return refreshVisibility(req);
  if (Date.now() - visCache.at > VIS_TTL_MS) event.waitUntil(refreshVisibility(req));
  return visCache.v;
}

export async function middleware(req: NextRequest, event: NextFetchEvent) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(USER_COOKIE)?.value;
  const session = await verifyUserTokenEdge(token, process.env.ADMIN_PASSWORD);
  const role: UserRole | "guest" = session?.role ?? "guest";

  // Admin area: must be logged in with role=admin.
  if (pathname.startsWith("/admin")) {
    // /admin itself is the login page — let it render.
    if (pathname === "/admin") return NextResponse.next();
    if (role === "admin") return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  // Tool pages: block when the viewer's role cannot see this tool.
  if (TOOL_HREFS.has(pathname)) {
    if (role === "admin") return NextResponse.next();
    const vis = await getVisibility(req, event);
    // On read failure, fall through — don't lock users out.
    if (!vis) return NextResponse.next();
    const allowed = role === "user" ? vis.user : vis.guest;
    if (!allowed.has(pathname)) {
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
