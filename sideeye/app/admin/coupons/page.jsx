import { requireAdmin } from "../../../lib/guards.js";
import { prisma } from "../../../lib/prisma.js";
import CouponManager from "./manager.jsx";

export const metadata = {
  title: "Admin coupons — SideEye",
};

export default async function AdminCouponsPage() {
  await requireAdmin();

  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      code: true,
      type: true,
      value: true,
      minOrderPaise: true,
      maxDiscountPaise: true,
      usageLimit: true,
      perUserLimit: true,
      usedCount: true,
      startsAt: true,
      expiresAt: true,
      isActive: true,
      _count: { select: { userCoupons: true, orders: true } },
    },
  });

  const serialised = coupons.map((c) => ({
    ...c,
    startsAt: c.startsAt.toISOString(),
    expiresAt: c.expiresAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Coupons</h1>
      <p className="mt-2 text-sm text-neutral-600">
        New coupons live for exactly 5 days. Assign a coupon to a user to make it
        personal to their account.
      </p>
      <CouponManager initialCoupons={serialised} />
    </div>
  );
}
