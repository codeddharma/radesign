import { NextResponse, type NextRequest } from "next/server";
import { SITE_URL } from "@/lib/site";

const COOKIE = "ra_admin_session";
const CANONICAL = new URL(SITE_URL);
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/**
 * Absolute URL of the login page on the host the visitor actually used.
 *
 * `new URL("/admin/login", request.url)` cannot be used: Next builds that from
 * the server's own bound address, so behind a reverse proxy every visitor to
 * the live domain was redirected to 127.0.0.1 — unreachable from their
 * machine. A relative Location is rejected by Next with ERR_INVALID_URL.
 *
 * The forwarded host is therefore read directly, but only honoured when it is
 * the canonical domain or a local address. Anything else falls back to
 * SITE_URL: these headers come from the client unless the proxy overwrites
 * them, so an unchecked value would let a caller choose where the login page
 * appears to live and turn this into a phishing redirect.
 */
function loginUrl(request: NextRequest): URL {
  const forwarded = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (forwarded) {
    const hostname = forwarded.split(":")[0].toLowerCase();
    const bare = CANONICAL.hostname.replace(/^www\./, "");
    const local = LOCAL_HOSTS.has(hostname);
    if (local || hostname === bare || hostname === `www.${bare}`) {
      const proto = request.headers.get("x-forwarded-proto") ?? (local ? "http" : CANONICAL.protocol.replace(":", ""));
      return new URL("/admin/login", `${proto}://${forwarded}`);
    }
  }
  return new URL("/admin/login", SITE_URL);
}

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

  return NextResponse.redirect(loginUrl(request));
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
