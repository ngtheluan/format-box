import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminTokenEdge, ADMIN_COOKIE } from "@/lib/admin-auth-edge";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // /admin itself is the login page — allow through.
  if (pathname === "/admin") return NextResponse.next();
  if (!pathname.startsWith("/admin/")) return NextResponse.next();

  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  const ok = await verifyAdminTokenEdge(token, process.env.ADMIN_PASSWORD);
  if (ok) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/admin";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*"],
};
