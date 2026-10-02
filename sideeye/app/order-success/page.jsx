import { redirect } from "next/navigation";
import { requireUser } from "../../lib/guards.js";
import { prisma } from "../../lib/prisma.js";
import { formatPaise } from "../../lib/money.js";

export const dynamic = "force-dynamic";

export default async function OrderSuccessPage({ searchParams }) {
  const user = await requireUser();
  const orderNumber = searchParams?.order;

  if (!orderNumber) {
    redirect("/account/orders");
  }

  const order = await prisma.order.findFirst({
    where: { number: orderNumber, userId: user.id },
    include: { items: true },
  });

  if (!order) {
    redirect("/account/orders");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
        <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="mt-6 font-display text-3xl font-bold">Order placed!</h1>
      <p className="mt-2 text-neutral-600">
        Order <span className="font-bold text-neutral-900">{order.number}</span> is confirmed.
        We will call {order.addressSnapshot?.phone} to confirm delivery.
      </p>

      <div className="mt-8 rounded-3xl bg-surface p-6 text-left ring-1 ring-neutral-200">
        <h2 className="font-display text-lg font-bold">Order details</h2>
        <dl className="mt-4 space-y-2 text-sm">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between">
              <dt>{item.nameSnapshot} × {item.qty}</dt>
              <dd className="font-semibold">{formatPaise(item.pricePaise * item.qty)}</dd>
            </div>
          ))}
          {order.discountPaise > 0 && (
            <div className="flex justify-between text-green-700">
              <dt>Discount</dt>
              <dd>-{formatPaise(order.discountPaise)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt>Shipping</dt>
            <dd className="font-semibold">
              {order.shippingPaise === 0 ? "Free" : formatPaise(order.shippingPaise)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-neutral-200 pt-2 text-lg font-bold">
            <dt>Total</dt>
            <dd>{formatPaise(order.totalPaise)}</dd>
          </div>
        </dl>
      </div>

      <p className="mt-6 text-sm text-neutral-600">
        Payment: Cash on delivery. Pay {formatPaise(order.totalPaise)} when your order arrives.
      </p>

      <a
        href="/shop"
        className="mt-6 inline-block rounded-2xl bg-brand px-8 py-3 font-bold text-white transition hover:bg-brand-dark focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
      >
        Continue shopping
      </a>
    </div>
  );
}