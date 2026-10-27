"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CART_CHANGED_EVENT, readCart } from "../lib/cart-storage.js";
import { cartCount } from "../lib/cart.js";

/**
 * Header bag link with a live item count.
 *
 * The cart lives in localStorage, which only exists in the browser, so the count is read
 * after mount rather than during the server render. Until then it renders nothing rather
 * than a hard-coded 0 — a "0" that flickers to "3" reads as a bug.
 *
 * `CART_CHANGED_EVENT` is dispatched by `lib/cart-storage.js` on every mutation, including
 * from another tab's `storage` event, so every badge on the page agrees.
 */
export default function CartBadge() {
  const [count, setCount] = useState(null);

  useEffect(() => {
    const sync = () => setCount(cartCount(readCart()));
    sync();

    window.addEventListener(CART_CHANGED_EVENT, sync);
    // Another tab writing the cart fires `storage`, which does not dispatch our event.
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CART_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return (
    <Link
      href="/cart"
      aria-label={count === null ? "Bag, loading" : `Bag, ${count} ${count === 1 ? "item" : "items"}`}
      className="relative rounded-lg px-2 py-2 text-neutral-700 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red sm:px-3"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
      {count ? (
        <span
          className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-red px-1 text-xs font-bold text-white"
          aria-hidden="true"
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}