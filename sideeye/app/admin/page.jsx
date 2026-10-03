import Link from "next/link";
import { requireAdmin } from "../../lib/guards.js";
import { prisma } from "../../lib/prisma.js";
import { formatPaise } from "../../lib/money.js";

export const metadata = {
  title: "Admin dashboard — SideEye",
};

/** Stock at or below this flags on the dashboard. */
export const LOW_STOCK_THRESHOLD = 5;

const TERMINAL_STATUSES = ["delivered", "cancelled", "refunded"];

export default async function AdminDashboardPage() {
  await requireAdmin();

  const [byStatus, collected, pending, lowStock, productCount] = await Promise.all([
    prisma.order.groupBy({
      by: ["status"],
      _count: { _all: true },
      _sum: { totalPaise: true },
    }),
    prisma.order.aggregate({
      where: { paymentMethod: "COD", status: "delivered" },
      _sum: { totalPaise: true },
      _count: { _all: true },
    }),
    prisma.order.aggregate({
      where: {
        paymentMethod: "COD",
        status: { notIn: TERMINAL_STATUSES },
      },
      _sum: { totalPaise: true },
      _count: { _all: true },
    }),
    prisma.product.findMany({
      where: { stockQty: { lte: LOW_STOCK_THRESHOLD } },
      orderBy: { stockQty: "asc" },
      take: 20,
      select: { id: true, name: true, slug: true, stockQty: true, isActive: true },
    }),
    prisma.product.count(),
  ]);

  const ordered = [...byStatus].sort((a, b) => b._count._all - a._count._all);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Admin</h1>

      <nav aria-label="Admin sections" className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-neutral-900 px-4 py-1.5 text-sm font-bold text-white">
          Dashboard
        </span>
        <Link
          href="/admin/products"
          className="rounded-full border border-neutral-300 px-4 py-1.5 text-sm font-bold hover:border-neutral-900"
        >
          Products
        </Link>
        {["Orders", "Coupons", "Reviews", "Users"].map((label) => (
          <span
            key={label}
            title="Arrives in Task 2"
            className="cursor-not-allowed rounded-full border border-dashed border-neutral-200 px-4 py-1.5 text-sm text-neutral-400"
          >
            {label}
          </span>
        ))}
      </nav>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-neutral-200 p-4">
          <p className="text-sm text-neutral-600">COD collected</p>
          <p className="mt-1 text-2xl font-extrabold">
            {formatPaise(collected._sum.totalPaise ?? 0)}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {collected._count._all} delivered order(s)
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-200 p-4">
          <p className="text-sm text-neutral-600">COD pending</p>
          <p className="mt-1 text-2xl font-extrabold">
            {formatPaise(pending._sum.totalPaise ?? 0)}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {pending._count._all} open order(s)
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-200 p-4">
          <p className="text-sm text-neutral-600">Products</p>
          <p className="mt-1 text-2xl font-extrabold">{productCount}</p>
          <p className="mt-1 text-xs text-neutral-500">
            <Link href="/admin/products" className="underline">
              Manage catalogue
            </Link>
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-200 p-4">
          <p className="text-sm text-neutral-600">Low stock (≤ {LOW_STOCK_THRESHOLD})</p>
          <p className="mt-1 text-2xl font-extrabold">{lowStock.length}</p>
          <p className="mt-1 text-xs text-neutral-500">Restock before they 404 sales</p>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="orders-by-status">
          <h2 id="orders-by-status" className="font-display text-xl font-extrabold">
            Orders by status
          </h2>
          {ordered.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-600">No orders yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-neutral-100 rounded-2xl border border-neutral-200">
              {ordered.map((row) => (
                <li
                  key={row.status}
                  className="flex items-center justify-between px-4 py-2.5 text-sm"
                >
                  <span className="font-bold capitalize">{row.status}</span>
                  <span className="text-neutral-600">
                    {row._count._all} · {formatPaise(row._sum.totalPaise ?? 0)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="low-stock">
          <h2 id="low-stock" className="font-display text-xl font-extrabold">
            Low stock
          </h2>
          {lowStock.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-600">Everything is stocked up.</p>
          ) : (
            <ul className="mt-3 divide-y divide-neutral-100 rounded-2xl border border-neutral-200">
              {lowStock.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between px-4 py-2.5 text-sm"
                >
                  <span>
                    <span className="font-bold">{p.name}</span>{" "}
                    {!p.isActive && (
                      <span className="ml-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                        hidden
                      </span>
                    )}
                  </span>
                  <span
                    className={
                      p.stockQty === 0
                        ? "font-extrabold text-red-700"
                        : "text-neutral-600"
                    }
                  >
                    {p.stockQty} left
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
