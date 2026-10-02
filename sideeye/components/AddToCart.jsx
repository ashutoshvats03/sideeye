"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MAX_QTY_PER_LINE } from "../lib/cart.js";
import { addItem } from "../lib/cart-storage.js";

/**
 * Quantity stepper + Add to bag + Buy it now.
 *
 * The cart is browser-local and only `{ slug, qty }` is ever persisted — price, stock and
 * name are re-read from the database server-side at checkout, so a stale or hand-edited
 * localStorage value can never change what the shopper is charged (spec §6, AGENTS.md).
 *
 * Qty is capped by BOTH `MAX_QTY_PER_LINE` (a sanity bound) and the product's real
 * `stockQty`, and the whole control is replaced when sold out, so the shopper is never
 * invited to buy something that does not exist.
 */
export default function AddToCart({ product }) {
  const router = useRouter();
  const soldOut = product.stockQty <= 0;
  const maxQty = Math.max(1, Math.min(MAX_QTY_PER_LINE, product.stockQty));

  const [qty, setQty] = useState(1);
  const [message, setMessage] = useState(null);

  function step(delta) {
    setQty((current) => {
      const next = current + delta;
      if (next < 1) return 1;
      if (next > maxQty) return maxQty;
      return next;
    });
  }

  function addToBag() {
    addItem(product.slug, qty, { maxQty: product.stockQty });
    setMessage(qty === 1 ? "Added to your bag." : `Added ${qty} to your bag.`);
  }

  function buyNow() {
    addItem(product.slug, qty, { maxQty: product.stockQty });
    router.push("/checkout");
  }

  if (soldOut) {
    return (
      <p className="rounded-2xl bg-neutral-900 px-6 py-4 text-center font-bold text-white">
        Sold out — this one is gone.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center rounded-2xl border-2 border-neutral-900">
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={qty <= 1}
            aria-label="Decrease quantity"
            className="px-4 py-3 text-xl font-bold transition hover:bg-neutral-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-inherit focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
          >
            &minus;
          </button>
          <span
            className="min-w-10 text-center text-lg font-bold"
            aria-live="polite"
            aria-label={`Quantity ${qty}`}
          >
            {qty}
          </span>
          <button
            type="button"
            onClick={() => step(1)}
            disabled={qty >= maxQty}
            aria-label="Increase quantity"
            className="px-4 py-3 text-xl font-bold transition hover:bg-neutral-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-inherit focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
          >
            +
          </button>
        </div>

        <p className="text-sm text-neutral-600">
          {product.stockQty <= MAX_QTY_PER_LINE
            ? `${product.stockQty} left — it goes.`
            : `${maxQty} max per order`}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={addToBag}
          className="flex-1 rounded-2xl bg-brand px-6 py-4 font-bold text-white transition hover:bg-brand-dark focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
        >
          Add to bag
        </button>
        <button
          type="button"
          onClick={buyNow}
          className="flex-1 rounded-2xl border-2 border-neutral-900 px-6 py-4 font-bold text-neutral-900 transition hover:bg-neutral-900 hover:text-white focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
        >
          Buy it now
        </button>
      </div>

      {message ? (
        <p
          role="status"
          className="rounded-2xl bg-surface px-4 py-3 text-sm font-semibold text-brand-dark"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}