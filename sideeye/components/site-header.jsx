import Image from "next/image";
import Link from "next/link";
import { getCurrentUser } from "../lib/guards.js";
import { isAdminRole } from "../lib/roles.js";
import { signOutAction } from "../app/actions.js";
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

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/brand/logo-lockup-red.png"
            alt="SideEye"
            width={96}
            height={96}
            preload
            className="h-10 w-10 rounded-xl object-cover"
          />
          <span className="font-display text-xl font-extrabold tracking-tight text-neutral-900">
            SideEye
          </span>
        </Link>

        <nav aria-label="Primary" className="flex items-center gap-1 sm:gap-3">
          <Link
            href="/shop"
            className="rounded-lg px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
          >
            Shop
          </Link>

          <CartBadge />

          {user ? (
            <>
              {isAdminRole(user.role) ? (
                <Link
                  href="/admin"
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
                >
                  Admin
                </Link>
              ) : null}
              <Link
                href="/account"
                className="max-w-[10rem] truncate rounded-lg px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
              >
                {user.name || "Account"}
              </Link>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="rounded-lg border-2 border-neutral-900 px-3 py-2 text-sm font-bold text-neutral-900 transition hover:bg-neutral-900 hover:text-white focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
                >
                  Log out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-brand-red px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-red-dark focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
            >
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
