"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatPaise } from "../../lib/money.js";
import { primaryImage } from "../../lib/images.js";
import {
  readWishlist,
  toggleStored,
  WISHLIST_CHANGED_EVENT,
} from "../../lib/wishlist.js";
import { addItem } from "../../lib/cart-storage.js";

/**
 * Wishlist contents — client-only because the slugs live in localStorage.
 * Resolves them through `/api/wishlist` so every price, name and photo comes
 * from the database; slugs that went inactive are counted and reported rather
 * than rendered stale.
 */
export default function WishlistList() {
  const [state, setState] = useState({ status: "loading", products: [], missing: 0 });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const slugs = readWishlist();
      if (slugs.length === 0) {
        if (!cancelled) setState({ status: "ready", products: [], missing: 0 });
        return;
      }
      try {
        const res = await fetch("/api/wishlist", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slugs }),
        });
        const data = await res.json();
        if (!cancelled) {
          const products = Array.isArray(data.products) ? data.products : [];
          setState({ status: "ready", products, missing: slugs.length - products.length });
        }
      } catch {
        if (!cancelled) setState({ status: "error", products: [], missing: 0 });
      }
    }

    load();
    window.addEventListener(WISHLIST_CHANGED_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(WISHLIST_CHANGED_EVENT, load);
    };
  }, []);

  function remove(slug) {
    toggleStored(slug);
  }

  function moveToBag(product) {
    addItem(product.slug, 1, { maxQty: Math.max(product.stockQty, 0) });
    toggleStored(product.slug);
  }

  if (state.status === "loading") {
    return <p className="mt-8 text-neutral-600">Reading your saved pieces…</p>;
  }

  if (state.status === "error") {
    return (
      <div className="mt-8 rounded-3xl border-2 border-neutral-200 p-8 text-center">
        <p className="font-bold">Could not load your wishlist just now.</p>
        <p className="mt-2 text-sm text-neutral-600">
          Your saved pieces are still in this browser — check your connection and reload.
        </p>
      </div>
    );
  }

  if (state.products.length === 0) {
    return (
      <div className="mt-8 rounded-3xl border-2 border-dashed border-neutral-300 p-10 text-center">
        <p aria-hidden="true" className="text-4xl text-neutral-300">♡</p>
        <p className="mt-4 font-display text-2xl font-bold">No saved pieces yet.</p>
        <p className="mt-2 text-neutral-600">
          Tap the heart on anything you love and it will wait for you here.
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-block rounded-2xl bg-brand px-6 py-3 font-bold text-white transition hover:bg-brand-dark focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
        >
          Shop the drop
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-4">
      {state.missing > 0 ? (
        <p role="status" className="rounded-2xl bg-surface px-4 py-3 text-sm text-neutral-700">
          {state.missing} saved {state.missing === 1 ? "piece is" : "pieces are"} no
          longer available and {state.missing === 1 ? "was" : "were"} removed from view.
        </p>
      ) : null}
      <ul className="space-y-4">
        {state.products.map((product) => (
          <li
            key={product.slug}
            className="flex gap-4 rounded-3xl border border-neutral-200 bg-white p-4"
          >
            <Link
              href={`/product/${product.slug}`}
              className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-surface focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
            >
              <Image
                src={primaryImage(product.images)}
                alt=""
                width={192}
                height={192}
                sizes="96px"
                className="h-full w-full object-cover"
              />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <Link
                href={`/product/${product.slug}`}
                className="truncate font-bold hover:text-brand-dark focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
              >
                {product.name}
              </Link>
              <p className="mt-0.5 text-sm font-bold text-brand-red">
                {formatPaise(product.pricePaise)}
              </p>
              <div className="mt-auto flex flex-wrap gap-2 pt-2">
                {product.stockQty > 0 ? (
                  <button
                    type="button"
                    onClick={() => moveToBag(product)}
                    className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-black focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
                  >
                    Move to bag
                  </button>
                ) : (
                  <span className="rounded-full bg-neutral-100 px-4 py-2 text-sm font-bold text-neutral-500">
                    Sold out
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => remove(product.slug)}
                  aria-label={`Remove ${product.name} from wishlist`}
                  className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-bold text-neutral-600 transition hover:border-neutral-900 hover:text-neutral-900 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
                >
                  Remove
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
