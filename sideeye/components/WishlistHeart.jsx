"use client";

import { useEffect, useState } from "react";
import {
  readWishlist,
  toggleStored,
  WISHLIST_CHANGED_EVENT,
} from "../lib/wishlist.js";

/**
 * Save-to-wishlist heart.
 *
 * A tiny client island so `ProductCard` stays a server component (no JS for
 * the card itself). State syncs across every heart on the page through
 * `WISHLIST_CHANGED_EVENT`, and the initial render is unfilled until the
 * effect reads storage — no SSR/storage mismatch flash, just a heart that
 * fills in when it is already saved.
 *
 * Works for signed-out visitors too (localStorage only, no account lookup);
 * the /wishlist page carries the login nudge instead, so nothing ever breaks.
 */
export default function WishlistHeart({ slug, name, className = "" }) {
  // Lazy init reads storage on first client render (SSR has no window —
  // `readWishlist` is guarded and returns [] there); the effect only
  // subscribes, so no synchronous setState-in-effect.
  const [saved, setSaved] = useState(() => readWishlist().includes(slug));

  useEffect(() => {
    const sync = () => setSaved(readWishlist().includes(slug));
    sync();
    window.addEventListener(WISHLIST_CHANGED_EVENT, sync);
    return () => window.removeEventListener(WISHLIST_CHANGED_EVENT, sync);
  }, [slug]);

  function toggle() {
    setSaved(toggleStored(slug).added);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from wishlist` : `Save ${name} to wishlist`}
      title={saved ? "Saved to wishlist" : "Save to wishlist"}
      className={`flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-xl shadow ring-1 ring-neutral-200 transition hover:scale-105 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red ${saved ? "text-brand-red" : "text-neutral-500"} ${className}`}
    >
      <span aria-hidden="true">{saved ? "♥" : "♡"}</span>
    </button>
  );
}
