"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatPaise } from "../../lib/money.js";
import { addItem } from "../../lib/cart-storage.js";

export default function CheckoutForm({ lines, totals, suggestions, user, placeOrder }) {
  const router = useRouter();
  const [address, setAddress] = useState({
    name: user.name ?? "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [couponCode, setCouponCode] = useState("");
  const [couponMessage, setCouponMessage] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  function update(field) {
    return (e) => setAddress((a) => ({ ...a, [field]: e.target.value }));
  }

  async function applyCoupon(e) {
    e.preventDefault();
    setCouponMessage(null);
    if (!couponCode.trim()) return;
    const res = await fetch("/api/coupon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: couponCode, items: lines.map((l) => ({ slug: l.slug, qty: l.qty })) }),
    });
    const data = await res.json();
    if (data.ok) {
      setCouponMessage(`Coupon applied: -${formatPaise(data.totals.discountPaise)}`);
    } else {
      setCouponMessage(data.error);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const idempotencyKey = crypto.randomUUID();
    const result = await placeOrder({
      items: lines.map((l) => ({ slug: l.slug, qty: l.qty })),
      address,
      couponCode: couponCode || null,
      idempotencyKey,
    });
    setBusy(false);
    if (result.ok) {
      router.push(`/order-success?order=${result.orderNumber}`);
    } else {
      setError(result.error);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <section aria-labelledby="address-heading">
        <h2 id="address-heading" className="font-display text-xl font-bold">
          Delivery address
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="block text-sm font-semibold">
              Full name
            </label>
            <input
              id="name"
              value={address.name}
              onChange={update("name")}
              required
              className="mt-1 w-full rounded-xl border-2 border-neutral-300 px-4 py-3 focus:border-brand focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-semibold">
              Mobile number
            </label>
            <input
              id="phone"
              value={address.phone}
              onChange={update("phone")}
              required
              pattern="[6-9][0-9]{9}"
              title="10-digit Indian mobile number"
              placeholder="9876543210"
              className="mt-1 w-full rounded-xl border-2 border-neutral-300 px-4 py-3 focus:border-brand focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="line1" className="block text-sm font-semibold">
              Address line 1
            </label>
            <input
              id="line1"
              value={address.line1}
              onChange={update("line1")}
              required
              placeholder="Flat, house no., building, street"
              className="mt-1 w-full rounded-xl border-2 border-neutral-300 px-4 py-3 focus:border-brand focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="line2" className="block text-sm font-semibold">
              Address line 2 <span className="font-normal text-neutral-500">(optional)</span>
            </label>
            <input
              id="line2"
              value={address.line2}
              onChange={update("line2")}
              placeholder="Area, landmark"
              className="mt-1 w-full rounded-xl border-2 border-neutral-300 px-4 py-3 focus:border-brand focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="city" className="block text-sm font-semibold">
              City
            </label>
            <input
              id="city"
              value={address.city}
              onChange={update("city")}
              required
              className="mt-1 w-full rounded-xl border-2 border-neutral-300 px-4 py-3 focus:border-brand focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="state" className="block text-sm font-semibold">
              State
            </label>
            <input
              id="state"
              value={address.state}
              onChange={update("state")}
              required
              className="mt-1 w-full rounded-xl border-2 border-neutral-300 px-4 py-3 focus:border-brand focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="pincode" className="block text-sm font-semibold">
              Pincode
            </label>
            <input
              id="pincode"
              value={address.pincode}
              onChange={update("pincode")}
              required
              pattern="[0-9]{6}"
              title="6-digit pincode"
              className="mt-1 w-full rounded-xl border-2 border-neutral-300 px-4 py-3 focus:border-brand focus:outline-none"
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="payment-heading">
        <h2 id="payment-heading" className="font-display text-xl font-bold">
          Payment
        </h2>
        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-3 rounded-2xl border-2 border-neutral-900 px-4 py-3">
            <input type="radio" name="payment" value="COD" defaultChecked className="h-5 w-5 accent-brand" />
            <span className="font-semibold">Cash on delivery</span>
          </label>
          <label className="flex items-center gap-3 rounded-2xl border-2 border-neutral-200 px-4 py-3 opacity-50">
            <input type="radio" name="payment" value="PREPAID" disabled className="h-5 w-5" />
            <span className="font-semibold">Prepaid (coming soon)</span>
          </label>
        </div>
      </section>

      <section aria-labelledby="coupon-heading">
        <h2 id="coupon-heading" className="font-display text-xl font-bold">
          Coupon
        </h2>
        <form onSubmit={applyCoupon} className="mt-4 flex gap-3">
          <input
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder="Enter code"
            className="flex-1 rounded-xl border-2 border-neutral-300 px-4 py-3 uppercase focus:border-brand focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-xl border-2 border-neutral-900 px-6 py-3 font-bold transition hover:bg-neutral-900 hover:text-white focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
          >
            Apply
          </button>
        </form>
        {couponMessage && (
          <p role="status" className="mt-2 text-sm font-semibold text-brand-dark">
            {couponMessage}
          </p>
        )}
      </section>

      {suggestions.length > 0 && (
        <section aria-labelledby="suggestions-heading">
          <h2 id="suggestions-heading" className="font-display text-xl font-bold">
            Complete the look
          </h2>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {suggestions.map((s) => (
              <li key={s.slug} className="rounded-2xl bg-surface p-3 ring-1 ring-neutral-200">
                <p className="truncate text-sm font-semibold">{s.name}</p>
                <p className="text-sm text-neutral-600">{formatPaise(s.pricePaise)}</p>
                <button
                  type="button"
                  onClick={() => addItem(s.slug, 1, { maxQty: 99 })}
                  className="mt-2 w-full rounded-lg border-2 border-neutral-900 py-1.5 text-sm font-bold transition hover:bg-neutral-900 hover:text-white focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {error && (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-2xl bg-brand px-6 py-4 text-lg font-bold text-white transition hover:bg-brand-dark disabled:opacity-50 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
      >
        {busy ? "Placing order…" : `Place order · ${formatPaise(totals.totalPaise)}`}
      </button>
    </form>
  );
}