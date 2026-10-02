"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatPaise } from "../lib/money.js";
import { FREE_SHIPPING_ABOVE_PAISE } from "../lib/pricing.js";
import { MAX_QTY_PER_LINE } from "../lib/cart.js";
import { readCart, updateItem, removeItem } from "../lib/cart-storage.js";

/**
 * The cart page body.
 *
 * The cart itself lives in localStorage as `[{ slug, qty }]`. This island reads it, then
 * asks the server for enriched lines and totals — the client never computes or displays a
 * price of its own, so a tampered cart cannot change what the shopper is shown or charged.
 */
export default function CartClient() {
  const [lines, setLines] = useState(null); // null = still loading
  const [totals, setTotals] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponMsg, setCouponMsg] = useState(null); // { ok: boolean, text: string }
  const [couponTotals, setCouponTotals] = useState(null);
  const [busy, setBusy] = useState(false);

  const fetchCart = useCallback(async (cart = readCart()) => {
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cart }),
    });
    if (!res.ok) throw new Error(`cart fetch failed with ${res.status}`);
    return res.json();
  }, []);

  const refresh = useCallback(
    async (cart) => {
      try {
        const data = await fetchCart(cart);
        setLines(data.lines);
        setTotals(data.totals);
      } catch {
        // Post-edit refresh: keep whatever is on screen rather than blanking the cart.
      }
    },
    [fetchCart],
  );

  // The initial load sets state only in the promise continuations, never
  // synchronously in the effect body — and a failed fetch lands on the error
  // state below instead of spinning forever.
  useEffect(() => {
    fetchCart().then(
      (data) => {
        setLines(data.lines);
        setTotals(data.totals);
      },
      () => setLoadError(true),
    );
  }, [fetchCart]);

  async function retryLoad() {
    setLoadError(false);
    try {
      const data = await fetchCart();
      setLines(data.lines);
      setTotals(data.totals);
    } catch {
      setLoadError(true);
    }
  }

  // A coupon is only valid against a specific cart. Any edit invalidates it, so the
  // displayed discount is dropped rather than left applied to a cart it was not checked
  // against.
  function invalidateCoupon() {
    setCouponMsg(null);
    setCouponTotals(null);
  }

  async function changeQty(slug, qty) {
    const next = updateItem(slug, qty);
    invalidateCoupon();
    await refresh(next);
  }

  async function dropLine(slug) {
    const next = removeItem(slug);
    invalidateCoupon();
    await refresh(next);
  }

  async function applyCoupon(event) {
    event.preventDefault();
    setBusy(true);
    setCouponMsg(null);
    try {
      const res = await fetch("/api/coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, items: readCart() }),
      });
      const data = await res.json();
      if (data.ok) {
        setCouponMsg({ ok: true, text: `Coupon ${data.coupon.code} applied.` });
        setCouponTotals(data.totals);
      } else {
        setCouponMsg({ ok: false, text: data.error || "That coupon did not work." });
        setCouponTotals(null);
      }
    } catch {
      setCouponMsg({ ok: false, text: "Could not check that coupon. Try again." });
    } finally {
      setBusy(false);
    }
  }

  if (lines === null && loadError) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h2 className="font-display text-2xl font-bold">Could not load your bag</h2>
        <p className="mt-2 text-neutral-600">
          Check your connection and try again — nothing in your bag was lost.
        </p>
        <button
          type="button"
          onClick={retryLoad}
          className="mt-6 rounded-2xl bg-brand px-6 py-3 font-bold text-white transition hover:bg-brand-dark focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
        >
          Try again
        </button>
      </div>
    );
  }

  if (lines === null) {
    return <p className="py-16 text-center text-neutral-600">Loading your bag…</p>;
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <div className="mx-auto mb-6 h-24 w-24 overflow-hidden rounded-2xl shadow-md ring-1 ring-neutral-200">
          <Image
            src="/brand/mascot-queen.png"
            alt=""
            width={192}
            height={192}
            className="h-full w-full object-cover"
            preload
          />
        </div>
        <h2 className="font-display text-2xl font-bold">Your bag is empty</h2>
        <p className="mt-2 text-neutral-600">
          Nothing here yet. Go find something worth a second look.
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

  const shown = couponTotals ?? totals;
  const remaining = FREE_SHIPPING_ABOVE_PAISE - shown.subtotalPaise;
  const progress = Math.min(1, shown.subtotalPaise / FREE_SHIPPING_ABOVE_PAISE);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <ul className="space-y-4" aria-label="Items in your bag">
        {lines.map(({ product, qty }) => (
          <li
            key={product.slug}
            className="flex gap-4 rounded-3xl bg-white p-4 ring-1 ring-neutral-200"
          >
            <Link
              href={`/product/${product.slug}`}
              className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-surface"
            >
              <Image
                src={product.images[0]}
                alt={product.name}
                width={192}
                height={192}
                className="h-full w-full object-cover"
              />
            </Link>

            <div className="flex flex-1 flex-col">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/product/${product.slug}`}
                    className="font-bold hover:text-brand"
                  >
                    {product.name}
                  </Link>
                  <p className="text-sm text-neutral-600">
                    {formatPaise(product.pricePaise)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => dropLine(product.slug)}
                  className="text-sm text-neutral-500 underline-offset-2 hover:text-brand hover:underline focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
                >
                  Remove
                </button>
              </div>

              <div className="mt-auto flex items-center gap-3 pt-3">
                <div className="flex items-center rounded-xl border-2 border-neutral-900">
                  <button
                    type="button"
                    onClick={() => changeQty(product.slug, qty - 1)}
                    disabled={qty <= 1}
                    aria-label={`Decrease quantity of ${product.name}`}
                    className="px-3 py-1.5 text-lg font-bold transition hover:bg-neutral-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-inherit focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
                  >
                    &minus;
                  </button>
                  <span
                    className="min-w-8 text-center font-bold"
                    aria-live="polite"
                    aria-label={`Quantity ${qty}`}
                  >
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => changeQty(product.slug, qty + 1)}
                    disabled={qty >= Math.min(MAX_QTY_PER_LINE, product.stockQty)}
                    aria-label={`Increase quantity of ${product.name}`}
                    className="px-3 py-1.5 text-lg font-bold transition hover:bg-neutral-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-inherit focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
                  >
                    +
                  </button>
                </div>
                <span className="ml-auto font-bold">
                  {formatPaise(product.pricePaise * qty)}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <aside className="h-fit rounded-3xl bg-white p-6 ring-1 ring-neutral-200 lg:sticky lg:top-24">
        <h2 className="font-display text-xl font-bold">Order summary</h2>

        <div className="mt-4">
          {remaining > 0 ? (
            <p className="text-sm text-neutral-600">
              Add{" "}
              <strong className="text-brand-dark">{formatPaise(remaining)}</strong>{" "}
              more for free shipping.
            </p>
          ) : (
            <p className="text-sm font-semibold text-brand-dark">
              You have unlocked free shipping.
            </p>
          )}
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-surface"
            role="progressbar"
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progress toward free shipping"
          >
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </div>

        <form onSubmit={applyCoupon} className="mt-5">
          <label htmlFor="coupon" className="text-sm font-semibold">
            Coupon code
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="coupon"
              name="code"
              value={couponCode}
              onChange={(event) => setCouponCode(event.target.value)}
              placeholder="e.g. FIRST10"
              autoComplete="off"
              className="min-w-0 flex-1 rounded-xl border-2 border-neutral-300 px-3 py-2 uppercase placeholder:normal-case focus:border-brand focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy || !couponCode.trim()}
              className="rounded-xl bg-neutral-900 px-4 py-2 font-bold text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
            >
              Apply
            </button>
          </div>
          {couponMsg ? (
            <p
              role="status"
              className={`mt-2 text-sm ${
                couponMsg.ok ? "text-brand-dark" : "text-red-700"
              }`}
            >
              {couponMsg.text}
            </p>
          ) : null}
        </form>

        <dl className="mt-5 space-y-2 border-t border-neutral-200 pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-neutral-600">Subtotal</dt>
            <dd className="font-semibold">{formatPaise(shown.subtotalPaise)}</dd>
          </div>
          {shown.discountPaise > 0 ? (
            <div className="flex justify-between text-brand-dark">
              <dt>Discount</dt>
              <dd className="font-semibold">−{formatPaise(shown.discountPaise)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt className="text-neutral-600">Shipping</dt>
            <dd className="font-semibold">
              {shown.shippingPaise === 0 ? "Free" : formatPaise(shown.shippingPaise)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-neutral-200 pt-2 text-base font-bold">
            <dt>Total</dt>
            <dd>{formatPaise(shown.totalPaise)}</dd>
          </div>
        </dl>

        <Link
          href="/checkout"
          className="mt-5 block rounded-2xl bg-brand px-6 py-4 text-center font-bold text-white transition hover:bg-brand-dark focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
        >
          Checkout
        </Link>
        <p className="mt-3 text-center text-xs text-neutral-500">
          Cash on delivery available. Prepaid coming soon.
        </p>
      </aside>
    </div>
  );
}
