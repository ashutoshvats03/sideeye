"use client";

/**
 * Admin coupon manager: create/edit form, active toggle, assign-to-user.
 *
 * Shape validation is the server's job (`lib/coupon-input.js`); this form
 * converts rupees ↔ integer paise with string math and surfaces the server's
 * error. Coupon codes are immutable after creation.
 */

import { useState } from "react";
import { formatPaise } from "../../../lib/money.js";
import {
  couponFormToPayload,
  couponToForm,
  emptyCouponForm,
} from "../../../lib/coupon-form.js";
import {
  createCoupon,
  updateCoupon,
  setCouponActive,
  assignCouponToUser,
} from "../../../actions/admin-ops.js";

const inputCls =
  "w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none";

export default function CouponManager({ initialCoupons }) {
  const [coupons, setCoupons] = useState(initialCoupons);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyCouponForm);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [assign, setAssign] = useState({ couponId: "", userEmail: "" });
  const [assignBusy, setAssignBusy] = useState(false);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  function startEdit(c) {
    setEditingId(c.id);
    setForm(couponToForm(c));
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyCouponForm());
    setMessage(null);
  }

  function buildPayload() {
    return couponFormToPayload(form);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const built = buildPayload();
    if (built.error) {
      setBusy(false);
      setMessage({ ok: false, text: built.error });
      return;
    }
    const result = editingId
      ? await updateCoupon({ id: editingId, ...built.data })
      : await createCoupon({ code: form.code.trim(), ...built.data });
    setBusy(false);
    if (!result.ok) {
      setMessage({ ok: false, text: result.error });
      return;
    }
    setMessage({ ok: true, text: editingId ? "Coupon updated." : "Coupon created — live for 5 days." });
    cancelEdit();
    window.location.reload();
  }

  async function handleToggle(c) {
    const result = await setCouponActive({ id: c.id, isActive: !c.isActive });
    if (!result.ok) {
      setMessage({ ok: false, text: result.error });
      return;
    }
    setCoupons((list) => list.map((x) => (x.id === c.id ? { ...x, isActive: !c.isActive } : x)));
  }

  async function handleAssign(e) {
    e.preventDefault();
    if (!assign.couponId || !assign.userEmail.trim()) return;
    setAssignBusy(true);
    setMessage(null);
    const result = await assignCouponToUser({
      couponId: assign.couponId,
      userEmail: assign.userEmail.trim(),
    });
    setAssignBusy(false);
    if (!result.ok) {
      setMessage({ ok: false, text: result.error });
      return;
    }
    setMessage({ ok: true, text: `Assigned to ${assign.userEmail.trim()}.` });
    setAssign({ couponId: "", userEmail: "" });
  }

  return (
    <div className="mt-6">
      {message && (
        <p
          role={message.ok ? "status" : "alert"}
          className={`rounded-2xl p-3 text-sm font-bold ${
            message.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-4 rounded-2xl border border-neutral-200 p-4">
        <h2 className="font-display text-xl font-extrabold">
          {editingId ? "Edit coupon" : "New coupon"}
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="font-bold">Code</span>
            <input
              className={inputCls}
              value={form.code}
              onChange={(e) => set({ code: e.target.value })}
              disabled={!!editingId}
              required={!editingId}
              maxLength={20}
              placeholder="DIWALI20"
            />
          </label>
          <label className="block text-sm">
            <span className="font-bold">Type</span>
            <select className={inputCls} value={form.type} onChange={(e) => set({ type: e.target.value })}>
              <option value="PERCENT">Percent (%)</option>
              <option value="FLAT">Flat (₹)</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-bold">{form.type === "PERCENT" ? "Percent (1–100)" : "Amount (₹)"}</span>
            <input
              className={inputCls}
              value={form.value}
              onChange={(e) => set({ value: e.target.value })}
              inputMode="numeric"
              required
            />
          </label>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-bold">Min order (₹)</span>
            <input
              className={inputCls}
              value={form.minOrder}
              onChange={(e) => set({ minOrder: e.target.value })}
              inputMode="decimal"
            />
          </label>
          <label className="block text-sm">
            <span className="font-bold">Max discount (₹, optional)</span>
            <input
              className={inputCls}
              value={form.maxDiscount}
              onChange={(e) => set({ maxDiscount: e.target.value })}
              inputMode="decimal"
              placeholder="Caps percent coupons"
            />
          </label>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-bold">Total usage limit (optional)</span>
            <input
              className={inputCls}
              value={form.usageLimit}
              onChange={(e) => set({ usageLimit: e.target.value })}
              inputMode="numeric"
            />
          </label>
          <label className="block text-sm">
            <span className="font-bold">Per-user limit (optional)</span>
            <input
              className={inputCls}
              value={form.perUserLimit}
              onChange={(e) => set({ perUserLimit: e.target.value })}
              inputMode="numeric"
            />
          </label>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm font-bold">
          <input type="checkbox" checked={form.isActive} onChange={(e) => set({ isActive: e.target.checked })} />
          Active
        </label>
        <div className="mt-4 flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? "Saving…" : editingId ? "Save changes" : "Create coupon"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-full border border-neutral-300 px-5 py-2 text-sm font-bold"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <form onSubmit={handleAssign} className="mt-4 rounded-2xl border border-neutral-200 p-4">
        <h2 className="font-display text-xl font-extrabold">Assign to a user</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-bold">Coupon</span>
            <select
              className={inputCls}
              value={assign.couponId}
              onChange={(e) => setAssign((a) => ({ ...a, couponId: e.target.value }))}
              required
            >
              <option value="">Choose…</option>
              {coupons.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-bold">User email</span>
            <input
              className={inputCls}
              type="email"
              value={assign.userEmail}
              onChange={(e) => setAssign((a) => ({ ...a, userEmail: e.target.value }))}
              required
              placeholder="shopper@example.com"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={assignBusy}
          className="mt-3 rounded-full bg-neutral-900 px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {assignBusy ? "Assigning…" : "Assign coupon"}
        </button>
      </form>

      <ul className="mt-6 divide-y divide-neutral-100 rounded-2xl border border-neutral-200">
        {coupons.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-2 px-4 py-3 text-sm">
            <div className="min-w-0">
              <p className="font-extrabold">
                {c.code}{" "}
                {!c.isActive && (
                  <span className="ml-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-normal text-neutral-500">
                    off
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-neutral-500">
                {c.type === "PERCENT" ? `${c.value}%` : formatPaise(c.value)}
                {" · "}min {formatPaise(c.minOrderPaise)}
                {c.maxDiscountPaise != null ? ` · cap ${formatPaise(c.maxDiscountPaise)}` : ""}
                {" · "}used {c.usedCount}{c.usageLimit != null ? `/${c.usageLimit}` : ""}
                {" · "}{c._count.userCoupons} assigned · {c._count.orders} orders
              </p>
            </div>
            <div className="flex shrink-0 gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => startEdit(c)}
                className="rounded-full border border-neutral-300 px-3 py-1"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleToggle(c)}
                className="rounded-full border border-neutral-300 px-3 py-1"
              >
                {c.isActive ? "Deactivate" : "Activate"}
              </button>
            </div>
          </li>
        ))}
        {coupons.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-neutral-500">
            No coupons yet — create the first one above.
          </li>
        )}
      </ul>
    </div>
  );
}
