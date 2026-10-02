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

  if (!requiresAuth(pathname)) return NextResponse.next();

  if (request.auth?.user) return NextResponse.next();

  return NextResponse.redirect(new URL(loginUrlFor(pathname, search), request.nextUrl));
});

export const config = {
  // Must cover at least PROTECTED_PREFIXES in lib/protected.js. `/api/auth` is untouched
  // so the auth endpoints are never redirected into a loop.
  matcher: ["/checkout/:path*", "/account/:path*", "/admin/:path*"],
};
