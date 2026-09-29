import { NextResponse, type NextRequest } from "next/server";

const COOKIE = "ra_admin_session";

/**
 * A cheap early gate, not the real check. Middleware runs on the Edge runtime,
 * where neither node:crypto nor the Mongo driver is available, so it cannot
 * verify the cookie signature or confirm the session row still exists. It only
 * turns away requests with a missing, malformed or expired cookie.
 *
 * The authoritative check stays in every page and route via
 * isAdminAuthenticated(), which does verify both. This is defence in depth: a
 * new admin route must still guard itself.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/admin/login")) return NextResponse.next();

  const [id, expiry, mac] = request.cookies.get(COOKIE)?.value.split(".") ?? [];
  if (id && mac && Number(expiry) > Date.now()) return NextResponse.next();

  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.redirect(new URL("/admin/login", request.url));
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
