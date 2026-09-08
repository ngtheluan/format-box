import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminTokenEdge, ADMIN_COOKIE } from "@/lib/admin-auth-edge";
import { SEED_TOOLS } from "@/lib/tools-shared";

const TOOL_HREFS = new Set(SEED_TOOLS.map((t) => t.href));

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
    try {
      const res = await fetch(new URL("/api/tools", req.url), {
        next: { revalidate: 60, tags: ["tools"] },
      });
      if (res.ok) {
        const { tools } = (await res.json()) as { tools: { href: string }[] };
        const active = new Set(tools.map((t) => t.href));
        if (!active.has(pathname)) {
          const url = req.nextUrl.clone();
          url.pathname = "/forbidden";
          url.searchParams.set("from", pathname);
          return NextResponse.rewrite(url);
        }
      }
    } catch {
      // On failure, fall through and allow — don't lock users out on API error.
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/base64",
    "/bill",
    "/calendar",
    "/color",
    "/countdown",
    "/curl",
    "/exchange-currency",
    "/favicon-export",
    "/fuel",
    "/gold",
    "/graph",
    "/image",
    "/json",
    "/jwt",
    "/lucky-ticket",
    "/markdown",
    "/responsive",
    "/speed-test",
    "/text-case",
    "/timestamp",
    "/weather",
    "/wheel",
  ],
};
