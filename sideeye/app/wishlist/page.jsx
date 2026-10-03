import Link from "next/link";
import { getCurrentUser } from "../../lib/guards.js";
import WishlistList from "./list.jsx";

export const metadata = {
  title: "Wishlist — SideEye",
  description: "Your saved SideEye pieces.",
};

/**
 * Wishlist page. Saved slugs live in this browser's localStorage, so the list
 * itself is a client island — but the login nudge is server-rendered: wishlist
 * sync follows the account, so signed-out visitors are asked to sign in while
 * their locally saved pieces still show (nothing ever breaks).
 */
export default async function WishlistPage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="text-sm font-bold uppercase tracking-widest text-brand-red">
        Saved
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Wishlist</h1>

      {user ? null : (
        <p className="mt-4 rounded-2xl bg-surface px-4 py-3 text-sm text-neutral-700">
          <span className="font-bold">Tip:</span> your saves live in this browser
          right now.{" "}
          <Link href="/login?callbackUrl=%2Fwishlist" className="font-bold text-brand-dark underline">
            Log in
          </Link>{" "}
          so they follow your account everywhere.
        </p>
      )}

      <WishlistList />
    </div>
  );
}
