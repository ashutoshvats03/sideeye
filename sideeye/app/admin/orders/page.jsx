import { requireAdmin } from "../../../lib/guards.js";
import { prisma } from "../../../lib/prisma.js";
import OrderManager from "./manager.jsx";

export const metadata = {
  title: "Admin orders — SideEye",
};

export default async function AdminOrdersPage() {
  await requireAdmin();

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      number: true,
      status: true,
      paymentMethod: true,
      paymentStatus: true,
      subtotalPaise: true,
      discountPaise: true,
      shippingPaise: true,
      totalPaise: true,
      createdAt: true,
      timeline: true,
      coupon: { select: { code: true } },
      user: { select: { name: true, email: true } },
      items: {
        select: { nameSnapshot: true, qty: true, pricePaise: true },
      },
    },
  });

  const serialised = orders.map((o) => ({
    ...o,
    createdAt: o.createdAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Orders</h1>
      <p className="mt-2 text-sm text-neutral-600">
        {orders.length} most recent order(s). Status buttons show only the moves the
        state machine allows.
      </p>
      <OrderManager initialOrders={serialised} />
    </div>
  );
}
