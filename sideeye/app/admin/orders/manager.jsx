"use client";

/**
 * Admin order list. The buttons rendered for each order are exactly
 * `legalTargets(order.status)` — an illegal jump cannot even be submitted,
 * and the server re-validates through the same map anyway.
 */

import { useState } from "react";
import { formatPaise } from "../../../lib/money.js";
import { legalTargets } from "../../../lib/order-status.js";
import { setOrderStatus } from "../../../actions/admin-ops.js";

export default function OrderManager({ initialOrders }) {
  const [orders, setOrders] = useState(initialOrders);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState(null);

  async function move(order, to) {
    setBusyId(order.id);
    setMessage(null);
    const result = await setOrderStatus({ orderId: order.id, to });
    setBusyId(null);
    if (!result.ok) {
      setMessage({ ok: false, text: result.error });
      return;
    }
    setOrders((list) =>
      list.map((o) =>
        o.id === order.id
          ? {
              ...o,
              status: to,
              timeline: [
                ...(Array.isArray(o.timeline) ? o.timeline : []),
                { status: to, at: new Date().toISOString(), note: "Marked by admin" },
              ],
            }
          : o,
      ),
    );
  }

  return (
    <div className="mt-6">
      {message && (
        <p
          role="alert"
          className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-800"
        >
          {message.text}
        </p>
      )}
      <ul className="mt-4 space-y-4">
        {orders.map((o) => {
          const targets = legalTargets(o.status);
          return (
            <li key={o.id} className="rounded-2xl border border-neutral-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-extrabold">{o.number}</p>
                  <p className="text-xs text-neutral-500">
                    {o.user?.email} · {new Date(o.createdAt).toLocaleString("en-IN")}
                    {o.coupon ? ` · coupon ${o.coupon.code}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <span className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-bold capitalize text-white">
                    {o.status}
                  </span>
                  <p className="mt-1 text-sm font-extrabold">{formatPaise(o.totalPaise)}</p>
                  <p className="text-xs text-neutral-500">{o.paymentMethod} · {o.paymentStatus}</p>
                </div>
              </div>

              <details className="mt-2 text-sm">
                <summary className="cursor-pointer font-bold">
                  {o.items.length} item(s) · timeline ({Array.isArray(o.timeline) ? o.timeline.length : 0})
                </summary>
                <ul className="mt-1 space-y-1 text-xs text-neutral-600">
                  {o.items.map((item, i) => (
                    <li key={i}>
                      {item.qty} × {item.nameSnapshot} — {formatPaise(item.pricePaise)}
                    </li>
                  ))}
                </ul>
                <ul className="mt-2 space-y-1 text-xs text-neutral-600">
                  {(Array.isArray(o.timeline) ? o.timeline : []).map((t, i) => (
                    <li key={i}>
                      <span className="font-bold capitalize">{t?.status}</span>
                      {t?.at ? ` · ${new Date(t.at).toLocaleString("en-IN")}` : ""}
                      {t?.note ? ` · ${t.note}` : ""}
                    </li>
                  ))}
                </ul>
              </details>

              {targets.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {targets.map((to) => (
                    <button
                      key={to}
                      type="button"
                      disabled={busyId === o.id}
                      onClick={() => move(o, to)}
                      className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-bold capitalize hover:border-neutral-900 disabled:opacity-50"
                    >
                      {busyId === o.id ? "…" : `Mark ${to}`}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs text-neutral-400">
                  Terminal state — no further moves.
                </p>
              )}
            </li>
          );
        })}
        {orders.length === 0 && (
          <li className="rounded-2xl border border-neutral-200 p-6 text-center text-sm text-neutral-500">
            No orders yet.
          </li>
        )}
      </ul>
    </div>
  );
}
