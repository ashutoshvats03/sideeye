// Demo data for manual testing on the dev database — NOT part of the real seed.
//
// Creates 5 rows in each of: User, Address, Coupon, Order (+ OrderItems),
// Review, UserCoupon, StockReservation. The catalogue (Category/Product) is
// curated and deliberately untouched.
//
// Idempotent: safe to run repeatedly (upserts on unique keys, and addresses /
// reservations are only created when the demo user has none).
//
// Test cheat-sheet (all phones are valid Indian mobiles for the track page):
//   Track:  SE-DEMO-01 … SE-DEMO-05  with phones 9876500001 … 9876500005
//   Coupon: TEST10  (10% off, no minimum — works on any cart)
//           FLAT50  (flat Rs.50 off on orders above Rs.499)
//           MIN999  (15% off on orders above Rs.999)
//           EXPIRED1 (expired — shows the error path)
//           PAUSED20 (inactive — shows the error path)
//
// NOTE: demo orders do NOT decrement Product.stockQty, so the catalogue stays
// intact for further testing.

import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { computeTotals } from "../lib/pricing.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DEMO_USERS = [
  { name: "Asha Demo", email: "demo1@example.invalid", phone: "9876500001", city: "Mumbai" },
  { name: "Bina Demo", email: "demo2@example.invalid", phone: "9876500002", city: "Delhi" },
  { name: "Chitra Demo", email: "demo3@example.invalid", phone: "9876500003", city: "Bengaluru" },
  { name: "Divya Demo", email: "demo4@example.invalid", phone: "9876500004", city: "Jaipur" },
  { name: "Esha Demo", email: "demo5@example.invalid", phone: "9876500005", city: "Pune" },
];

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
const freshExpiry = () => new Date(Date.now() + FIVE_DAYS_MS);

const DEMO_COUPONS = [
  { code: "TEST10", type: "PERCENT", value: 10, minOrderPaise: 0, maxDiscountPaise: 50000, usageLimit: 1000, perUserLimit: null, isActive: true, expiresAt: freshExpiry() },
  { code: "FLAT50", type: "FLAT", value: 5000, minOrderPaise: 49900, maxDiscountPaise: null, usageLimit: 500, perUserLimit: null, isActive: true, expiresAt: freshExpiry() },
  { code: "MIN999", type: "PERCENT", value: 15, minOrderPaise: 99900, maxDiscountPaise: 100000, usageLimit: 200, perUserLimit: 2, isActive: true, expiresAt: freshExpiry() },
  { code: "EXPIRED1", type: "PERCENT", value: 20, minOrderPaise: 0, maxDiscountPaise: null, usageLimit: null, perUserLimit: null, isActive: true, expiresAt: new Date("2020-01-01T00:00:00Z") },
  { code: "PAUSED20", type: "PERCENT", value: 20, minOrderPaise: 0, maxDiscountPaise: null, usageLimit: null, perUserLimit: null, isActive: false, expiresAt: freshExpiry() },
];

const ORDER_STATUSES = ["pending", "confirmed", "packed", "shipped", "delivered"];

function addressSnapshot(user, city) {
  return {
    name: user.name,
    phone: user.phone,
    line1: "14 Demo Lane, MG Road",
    line2: null,
    city,
    state: "Maharashtra",
    pincode: "400001",
  };
}

async function main() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { slug: "asc" },
    take: 8,
    select: { id: true, name: true, slug: true, pricePaise: true, mrpPaise: true, images: true },
  });
  if (products.length < 5) throw new Error("Need at least 5 active products for demo data.");

  // --- Users + Addresses ----------------------------------------------------
  const users = [];
  for (const u of DEMO_USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, phone: u.phone },
      create: { name: u.name, email: u.email, phone: u.phone, role: "customer" },
    });
    users.push({ ...user, city: u.city });
    const existing = await prisma.address.findFirst({ where: { userId: user.id } });
    if (!existing) {
      await prisma.address.create({
        data: { userId: user.id, label: "Home", ...addressSnapshot(u, u.city) },
      });
    }
  }

  // --- Coupons --------------------------------------------------------------
  const coupons = {};
  for (const c of DEMO_COUPONS) {
    coupons[c.code] = await prisma.coupon.upsert({
      where: { code: c.code },
      update: { ...c },
      create: { ...c },
    });
  }

  // --- UserCoupons (per-user coupon assignments) -----------------------------
  const userCouponPairs = [
    [users[0], coupons.MIN999, 1],
    [users[1], coupons.MIN999, 0],
    [users[2], coupons.MIN999, 2],
    [users[3], coupons.FLAT50, 0],
    [users[4], coupons.TEST10, 3],
  ];
  for (const [user, coupon, useCount] of userCouponPairs) {
    await prisma.userCoupon.upsert({
      where: { userId_couponId: { userId: user.id, couponId: coupon.id } },
      update: { useCount },
      create: { userId: user.id, couponId: coupon.id, useCount },
    });
  }

  // --- Orders (+ items): one per status --------------------------------------
  // Order 1 uses TEST10 so the coupon path has a real order behind it.
  const orderPlans = [
    { n: "SE-DEMO-01", user: users[0], coupon: coupons.TEST10, lines: [[products[0], 1], [products[1], 1]] },
    { n: "SE-DEMO-02", user: users[1], coupon: null, lines: [[products[2], 2]] },
    { n: "SE-DEMO-03", user: users[2], coupon: null, lines: [[products[3], 1]] },
    { n: "SE-DEMO-04", user: users[3], coupon: null, lines: [[products[4], 1], [products[5], 1]] },
    { n: "SE-DEMO-05", user: users[4], coupon: null, lines: [[products[6], 1]] },
  ];
  orderPlans.forEach((plan, i) => {
    plan.status = ORDER_STATUSES[i];
  });

  for (const plan of orderPlans) {
    const items = plan.lines.map(([p, qty]) => ({ pricePaise: p.pricePaise, qty }));
    const totals = computeTotals(items, plan.coupon);
    const snapshot = addressSnapshot(plan.user, plan.user.city);
    const data = {
      number: plan.n,
      userId: plan.user.id,
      status: plan.status,
      paymentMethod: "COD",
      paymentStatus: plan.status === "delivered" ? "paid" : "pending",
      subtotalPaise: totals.subtotalPaise,
      discountPaise: totals.discountPaise,
      shippingPaise: totals.shippingPaise,
      totalPaise: totals.totalPaise,
      couponId: plan.coupon ? plan.coupon.id : null,
      addressSnapshot: snapshot,
      timeline: [{ status: plan.status, at: new Date().toISOString(), note: "Demo order" }],
    };
    let order = await prisma.order.findUnique({ where: { number: plan.n } });
    if (!order) {
      order = await prisma.order.create({ data });
      await prisma.orderItem.createMany({
        data: plan.lines.map(([p, qty]) => ({
          orderId: order.id,
          productId: p.id,
          nameSnapshot: p.name,
          pricePaise: p.pricePaise,
          mrpPaise: p.mrpPaise,
          qty,
          imageSnapshot: p.images[0] ?? null,
        })),
      });
    } else {
      await prisma.order.update({ where: { id: order.id }, data });
    }
  }

  // --- Reviews (approved, one per user+product pair) ---------------------------
  const reviewPlans = [
    [products[0], users[0], 5, "Wore it to a wedding, got three compliments."],
    [products[1], users[1], 4, "Pretty and light. Slightly big on small fingers."],
    [products[2], users[2], 5, "Still shiny after a month of daily wear."],
    [products[3], users[3], 3, "Cute, but delivery took a week."],
    [products[4], users[4], 5, "My second SideEye piece. Obsessed."],
  ];
  for (const [product, user, rating, text] of reviewPlans) {
    await prisma.review.upsert({
      where: { productId_userId: { productId: product.id, userId: user.id } },
      update: { rating, text, isApproved: true },
      create: { productId: product.id, userId: user.id, rating, text, isApproved: true },
    });
  }

  // --- Stock reservations (active holds, expire in 1 hour) --------------------
  for (let i = 0; i < 5; i++) {
    const existing = await prisma.stockReservation.findFirst({
      where: { productId: products[i].id },
    });
    if (!existing) {
      await prisma.stockReservation.create({
        data: {
          productId: products[i].id,
          qty: 1,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
    }
  }

  console.log("Demo data ready: 5 users, 5 addresses, 5 coupons, 5 orders, 5 reviews, 5 user-coupons, 5 reservations.");
  console.log("Track with SE-DEMO-01..05 + phones 9876500001..5. Coupon TEST10 for checkout.");
}

await main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
