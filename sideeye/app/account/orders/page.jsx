import { requireUser } from "../../../lib/guards.js";
import { prisma } from "../../../lib/prisma.js";
import { formatPaise } from "../../../lib/money.js";
import { cancelOrder } from "../../../actions/checkout.js";

export const dynamic = "force-dynamic";

export default async function AccountOrdersPage() {
  const user = await requireUser();

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-display text-3xl font-bold">Your orders</h1>

      {orders.length === 0 ? (
        <div className="mt-8 rounded-3xl bg-surface p-8 text-center ring-1 ring-neutral-200">
          <p className="text-lg font-semibold">No orders yet.</p>
          <p className="mt-2 text-neutral-600">When you place an order, it will show up here.</p>
          <a
            href="/shop"
            className="mt-4 inline-block rounded-2xl bg-brand px-6 py-3 font-bold text-white transition hover:bg-brand-dark focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
          >
            Shop the drop
          </a>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {orders.map((order) => (
            <li key={order.id} className="rounded-3xl bg-surface p-6 ring-1 ring-neutral-200">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold">{order.number}</p>
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

              <dl className="mt-4 space-y-1 text-sm">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <dt>{item.nameSnapshot} × {item.qty}</dt>
                    <dd className="font-semibold">{formatPaise(item.pricePaise * item.qty)}</dd>
                  </div>
                ))}
                <div className="flex justify-between border-t border-neutral-200 pt-2 font-bold">
                  <dt>Total</dt>
                  <dd>{formatPaise(order.totalPaise)}</dd>
                </div>
              </dl>

              {["pending", "confirmed"].includes(order.status) && (
                <form
                  action={async () => {
                    "use server";
                    await cancelOrder({ orderId: order.id });
                  }}
                  className="mt-4"
                >
                  <button
                    type="submit"
                    className="rounded-xl border-2 border-red-600 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-600 hover:text-white focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
                  >
                    Cancel order
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}