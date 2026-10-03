import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { requireUser } from "../../../../lib/guards.js";
import { prisma } from "../../../../lib/prisma.js";
import { formatPaise } from "../../../../lib/money.js";
import { normaliseTimeline } from "../../../../lib/timeline.js";
import { cancelOrder } from "../../../../actions/checkout.js";

export const dynamic = "force-dynamic";

function SnapshotAddress({ snap }) {
  if (!snap || typeof snap !== "object") return <p>Address unavailable.</p>;
  const line = [snap.line1, snap.line2].filter(Boolean).join(", ");
  const town = [snap.city, snap.state, snap.pincode].filter(Boolean).join(" ");
  return (
    <div>
      <p className="font-bold">
        {snap.name || "Delivery address"}
        {snap.label ? <span className="ml-2 text-sm font-semibold text-neutral-500">({snap.label})</span> : null}
      </p>
      {line ? <p className="mt-1">{line}</p> : null}
      {town ? <p>{town}</p> : null}
      {snap.phone ? <p className="mt-1">Phone: {snap.phone}</p> : null}
    </div>
  );
}

/**
 * One order's receipt, scoped to its owner.
 *
 * A guessed order number belonging to someone else 404s — the query filters
 * by BOTH number and the signed-in user. The delivery address renders from
 * `addressSnapshot` (frozen at purchase), never from the live address book,
 * so later edits never rewrite history. One order's own total is shown here;
 * nothing on this page aggregates across orders.
 */
export default async function AccountOrderDetailPage({ params }) {
  const user = await requireUser("/account/orders");
  const { number } = await params;

  const order = await prisma.order.findFirst({
    where: { number, userId: user.id },
    include: { items: { include: { product: { select: { slug: true, isActive: true } } } } },
  });
  if (!order) notFound();

  const entries = normaliseTimeline(order.timeline);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/account/orders" className="text-sm font-bold text-brand hover:underline">
        ← All orders
      </Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-3xl font-bold">{order.number}</h1>
          <p className="text-sm text-neutral-600">
            {new Date(order.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-bold ${
            order.status === "delivered"
              ? "bg-green-100 text-green-800"
              : order.status === "cancelled"
                ? "bg-red-100 text-red-800"
                : "bg-blue-100 text-blue-800"
          }`}
        >
          {order.status}
        </span>
      </div>

      <section aria-label="Items" className="mt-6 rounded-3xl bg-surface p-6 ring-1 ring-neutral-200">
        <h2 className="font-bold">Items</h2>
        <dl className="mt-3 space-y-3 text-sm">
          {order.items.map((item) => {
            const live = item.product && item.product.isActive ? item.product.slug : null;
            return (
              <div key={item.id} className="flex items-center gap-3">
                {item.imageSnapshot ? (
                  <Image
                    src={item.imageSnapshot}
                    alt=""
                    width={56}
                    height={56}
                    className="h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-neutral-200"
                  />
                ) : null}
                <dt className="flex-1">
                  {live ? (
                    <Link href={`/product/${live}`} className="font-semibold hover:underline">
                      {item.nameSnapshot}
                    </Link>
                  ) : (
                    <span className="font-semibold">{item.nameSnapshot}</span>
                  )}
                  <span className="text-neutral-600"> × {item.qty}</span>
                </dt>
                <dd className="font-semibold">{formatPaise(item.pricePaise * item.qty)}</dd>
              </div>
            );
          })}
        </dl>
        <dl className="mt-3 space-y-1 border-t border-neutral-200 pt-3 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatPaise(order.subtotalPaise)}</dd>
          </div>
          {order.discountPaise > 0 ? (
            <div className="flex justify-between text-green-700">
              <dt>Discount</dt>
              <dd>−{formatPaise(order.discountPaise)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt>Shipping</dt>
            <dd>{order.shippingPaise === 0 ? "Free" : formatPaise(order.shippingPaise)}</dd>
          </div>
          <div className="flex justify-between pt-1 text-base font-bold">
            <dt>Total</dt>
            <dd>{formatPaise(order.totalPaise)}</dd>
          </div>
        </dl>
      </section>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <section
          aria-label="Delivery address"
          className="rounded-3xl bg-surface p-6 text-sm ring-1 ring-neutral-200"
        >
          <h2 className="font-bold">Delivery address</h2>
          <div className="mt-2">
            <SnapshotAddress snap={order.addressSnapshot} />
          </div>
        </section>
        <section
          aria-label="Payment"
          className="rounded-3xl bg-surface p-6 text-sm ring-1 ring-neutral-200"
        >
          <h2 className="font-bold">Payment</h2>
          <p className="mt-2">
            {order.paymentMethod === "COD" ? "Cash on delivery" : order.paymentMethod} ·{" "}
            {order.paymentStatus}
          </p>
        </section>
      </div>

      {entries.length > 0 ? (
        <section
          aria-label="Status timeline"
          className="mt-4 rounded-3xl bg-surface p-6 text-sm ring-1 ring-neutral-200"
        >
          <h2 className="font-bold">Tracking</h2>
          <ol className="mt-3 space-y-2">
            {entries.map((e, i) => (
              <li key={`${e.status}-${i}`} className="flex justify-between gap-4">
                <span className="font-semibold">{e.status}</span>
                <span className="text-neutral-600">
                  {e.at
                    ? new Date(e.at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : ""}
                  {e.note ? ` — ${e.note}` : ""}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {["pending", "confirmed"].includes(order.status) ? (
        <form
          action={async () => {
            "use server";
            await cancelOrder({ orderId: order.id });
          }}
          className="mt-6"
        >
          <button
            type="submit"
            className="rounded-2xl border-2 border-red-600 px-6 py-2.5 font-bold text-red-600 transition hover:bg-red-600 hover:text-white focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
          >
            Cancel order
          </button>
        </form>
      ) : null}
    </div>
  );
}
