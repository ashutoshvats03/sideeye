import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { getCurrentUser } from "../lib/guards.js";
import { sanitizeCallbackUrl } from "../lib/protected.js";
import { isAdminRole } from "../lib/roles.js";
import CartBadge from "./CartBadge.jsx";

/**
 * Site header with live auth state.
 *
 * Rendered on the server and reads the User row through `getCurrentUser()`, so a
 * deactivated account immediately renders as signed out instead of showing a stale
 * session. Costs static rendering for marketing pages, which is the right trade here:
 * auth accuracy beats a cached page.
 */
export default async function SiteHeader() {
  const user = await getCurrentUser();

  // Where the visitor is right now (set by proxy.js). The Log in link carries
  // it as callbackUrl so a sign-in started from the navbar returns here —
  // e.g. mid-checkout — instead of dumping the shopper on the home page.
  // Re-sanitized: the login page and signInAction sanitize again downstream.
  const heads = await headers();
  const raw = heads.get("x-pathname");
  // Never point back at /login itself (self-loop after sign-in).
  // And don't render the link at all ON /login: clicking it would clobber a
  // callbackUrl the shopper arrived with (e.g. %2Fcheckout from a bounce).
  const isLoginPage = (raw ?? "").split("?")[0] === "/login";
  const here =
    raw && raw.split("?")[0] === "/login"
      ? "/"
      : sanitizeCallbackUrl(raw, "/");
  const loginHref = `/login?callbackUrl=${encodeURIComponent(here)}`;

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 h-20 scale-150">
          <Image
            src="/brand/brand_logo.png"
            alt="SideEye"
            width={106}
            height={106}
            preload
            className="h-15 w-auto"
          />
        </Link>

        <nav aria-label="Primary" className="flex items-center gap-1 sm:gap-3">
          <CartBadge />

          <Link
            href="/wishlist"
            aria-label="Wishlist"
            title="Wishlist"
            className="rounded-lg px-2 py-2 text-neutral-700 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red sm:px-3"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </Link>

          {user ? (
            <>
              {isAdminRole(user.role) ? (
                <Link
                  href="/admin"
                  aria-label="Admin"
                  title="Admin"
                  className="rounded-lg px-2 py-2 text-neutral-700 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red sm:px-3"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </Link>
              ) : null}
              <Link
                href="/account"
                aria-label={user.name || "Account"}
                title={user.name || "Account"}
                className="rounded-lg px-2 py-2 text-neutral-700 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red sm:px-3"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </Link>
            </>
          ) : isLoginPage ? null : (
            <Link
              href={loginHref}
              className="rounded-lg bg-brand-red px-3 py-2 text-sm font-bold text-white transition hover:bg-brand-red-dark focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red sm:px-4"
            >
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
