import { prisma } from "../../lib/prisma.js";
import { formatPaise } from "../../lib/money.js";

export const dynamic = "force-dynamic";

const STATUS_STEPS = ["pending", "confirmed", "packed", "shipped", "delivered"];

export default async function TrackPage({ searchParams }) {
  // Next 15+: searchParams is a Promise — must be awaited, not read directly.
  const sp = await searchParams;
  const orderNumber = sp?.order?.trim();
  const phone = sp?.phone?.trim();

  let order = null;
  let error = null;

  if (orderNumber && phone) {
    const found = await prisma.order.findFirst({
      where: { number: orderNumber },
      include: { items: true },
    });

    // Owner check: the phone on the order must match the one entered.
    if (found && found.addressSnapshot?.phone === phone) {
      order = found;
    } else if (found) {
      error = "That phone number does not match this order.";
    } else {
      error = "Order not found. Check the number and try again.";
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-3xl font-bold">Track your order</h1>
      <p className="mt-2 text-neutral-600">
        Enter your order number and the mobile number you ordered with.
      </p>

      <form method="GET" className="mt-6 space-y-4">
        <div>
          <label htmlFor="order" className="block text-sm font-semibold">
            Order number
          </label>
          <input
            id="order"
            name="order"
            defaultValue={orderNumber ?? ""}
            placeholder="SE-XXXXXXXX"
            required
            className="mt-1 w-full rounded-xl border-2 border-neutral-300 px-4 py-3 uppercase focus:border-brand focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-semibold">
            Mobile number
          </label>
          <input
            id="phone"
            name="phone"
            defaultValue={phone ?? ""}
            placeholder="9876543210"
            required
            pattern="[6-9][0-9]{9}"
            title="10-digit Indian mobile number"
            className="mt-1 w-full rounded-xl border-2 border-neutral-300 px-4 py-3 focus:border-brand focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-2xl bg-brand px-6 py-4 font-bold text-white transition hover:bg-brand-dark focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
        >
          Track
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {error}
        </p>
      )}

      {order && (
        <div className="mt-8 rounded-3xl bg-surface p-6 ring-1 ring-neutral-200">
          <h2 className="font-display text-lg font-bold">{order.number}</h2>
          <p className="text-sm text-neutral-600">
            Placed{" "}
            {new Date(order.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>

          <ol className="mt-6 space-y-4" aria-label="Order progress">
            {STATUS_STEPS.map((step, i) => {
              const reached = STATUS_STEPS.indexOf(order.status) >= i;
              return (
                <li key={step} className="flex items-center gap-3">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                      reached ? "bg-brand text-white" : "bg-neutral-200 text-neutral-500"
                    }`}
                    aria-current={STATUS_STEPS.indexOf(order.status) === i ? "step" : undefined}
                  >
                    {i + 1}
                  </span>
                  <span className={reached ? "font-semibold capitalize" : "text-neutral-500"}>
                    {step}
                  </span>
                </li>
              );
            })}
          </ol>

          {order.status === "cancelled" && (
            <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
              This order was cancelled.
            </p>
          )}

          <dl className="mt-6 space-y-1 border-t border-neutral-200 pt-4 text-sm">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between">
                <dt>{item.nameSnapshot} × {item.qty}</dt>
                <dd className="font-semibold">{formatPaise(item.pricePaise * item.qty)}</dd>
              </div>
            ))}
            <div className="flex justify-between pt-2 font-bold">
              <dt>Total</dt>
              <dd>{formatPaise(order.totalPaise)}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}