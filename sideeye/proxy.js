/**
 * First line of route defence: a signed-out visitor is bounced to /login before any
 * protected page renders.
 *
 * NOTE ON THE FILENAME: Next.js 16 deprecated the `middleware.js` convention in favour of
 * `proxy.js` (https://nextjs.org/docs/messages/middleware-to-proxy). Same behaviour, same
 * runtime, new name — using `proxy.js` keeps us off the deprecation path.
 *
 * Wraps the EDGE-SAFE config only (`lib/auth.config.js`). Importing `lib/auth.js` here
 * would pull Prisma and `pg` into the Edge bundle and fail the build.
 *
 * This layer only knows about the session cookie. It deliberately does NOT check `role`
 * or `isActive`: both can change after a cookie is issued, so a proxy-level role check
 * would either be stale or need a DB round-trip on every request.
 * `requireUser()` / `requireAdmin()` in `lib/guards.js` re-read Postgres and are the
 * authoritative gate.
 */

import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./lib/auth.config.js";
import { loginUrlFor, requiresAuth } from "./lib/protected.js";

const { auth } = NextAuth(authConfig);

export default auth((request) => {
  const { pathname, search } = request.nextUrl;

  // Expose the current path to server components (SiteHeader builds a
  // callbackUrl-preserving Log in link from it). Server-set, but consumers
  // still sanitize before using it as a redirect target.
  const headers = new Headers(request.headers);
  headers.set("x-pathname", `${pathname}${search}`);

  if (!requiresAuth(pathname)) return NextResponse.next({ request: { headers } });

  if (request.auth?.user) return NextResponse.next({ request: { headers } });

  return NextResponse.redirect(new URL(loginUrlFor(pathname, search), request.nextUrl));
});

export const config = {
  // The x-pathname header feeds SiteHeader's callbackUrl-preserving Log in link,
  // which renders on PUBLIC pages — so the matcher must cover every page route,
  // not just the protected ones. API routes and static assets are untouched.
  // ADD NEW PAGES HERE when adding a route, or the Log in link on that page
  // falls back to callbackUrl=/ (home) instead of returning the shopper here.
  matcher: [
    "/",
    "/shop/:path*",
    "/cart",
    "/product/:path*",
    "/track",
    "/login",
    "/about",
    "/faq",
    "/contact",
    "/policies/:path*",
    "/order-success",
    "/checkout/:path*",
    "/account/:path*",
    "/admin/:path*",
  ],
};
