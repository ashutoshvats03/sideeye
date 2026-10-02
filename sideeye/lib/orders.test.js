// Proof-of-purchase gate for review submission, tested against the real Postgres.
//
// This is a security gate: if it returns true for somebody who never received the piece,
// anybody can post a review for any product. The interesting cases are therefore the
// NEGATIVE ones — a cancelled order, an undelivered order, somebody else's order, and a
// null/absent id.
//
// Every test creates its own users/products/orders and the suite deletes them, so it is
// safe to re-run against a database that already has real data.

import { test, expect, afterAll } from "bun:test";
import { prisma } from "./prisma.js";
import { hasPurchasedProduct, DELIVERED_STATUS } from "./orders.js";

const RUN = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const createdEmails = [];
const createdUserIds = [];

/** A scratch user, deleted in afterAll. */
async function makeUser(label) {
  const email = `sideeye-order-test-${label}-${RUN}@example.invalid`;
  createdEmails.push(email);
  const user = await prisma.user.create({
    data: { email, name: `Buyer ${label}` },
    select: { id: true, email: true },
  });
  createdUserIds.push(user.id);
  return user;
}

/** A scratch product in the real Ring category, deleted in afterAll. */
async function makeProduct(label) {
  const category = await prisma.category.findFirst({
    where: { slug: "ring" },
    select: { id: true },
  });
  if (!category) throw new Error("Seed the Ring category before running orders.test.js");

  return prisma.product.create({
    data: {
      name: `Test Ring ${label}`,
      slug: `test-ring-${label}-${RUN}`,
      description: "Scratch product for the proof-of-purchase test.",
      pricePaise: 19999,
      stockQty: 5,
      categoryId: category.id,
      isActive: true,
    },
    select: { id: true, slug: true },
  });
}

/** An order for `user` containing `product`, in the given status. */
async function makeOrder(userId, product, status) {
  return prisma.order.create({
    data: {
      number: `SE-TEST-${userId.slice(-6)}-${status}-${RUN}`.slice(0, 40),
      userId,
      status,
      paymentMethod: "COD",
      paymentStatus: "pending",
      subtotalPaise: product ? 19999 : 0,
      discountPaise: 0,
      shippingPaise: 4900,
      totalPaise: product ? 24899 : 4900,
      addressSnapshot: { city: "Testville" },
      timeline: [],
      items: product
        ? {
            create: {
              productId: product.id,
              nameSnapshot: "Test Ring",
              pricePaise: 19999,
              qty: 1,
            },
          }
        : undefined,
    },
    select: { id: true },
  });
}

afterAll(async () => {
  // `Order.userId` deliberately does NOT cascade — order history must not be destroyed by
  // an account deletion (P2003 otherwise). So the scratch orders go first; `OrderItem`
  // then cascades off the order on its own.
  await prisma.order.deleteMany({ where: { userId: { in: createdUserIds } } });
  await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  await prisma.product.deleteMany({ where: { slug: { startsWith: `test-ring-` } } });
  await prisma.$disconnect();
});

test("a delivered order counts as proof of purchase", async () => {
  const user = await makeUser("delivered");
  const product = await makeProduct("delivered");
  await makeOrder(user.id, product, DELIVERED_STATUS);

  expect(await hasPurchasedProduct(user.id, product.id)).toBe(true);
});

test("a pending order does NOT count", async () => {
  const user = await makeUser("pending");
  const product = await makeProduct("pending");
  await makeOrder(user.id, product, "pending");

  expect(await hasPurchasedProduct(user.id, product.id)).toBe(false);
});

test("a packed or shipped order does NOT count", async () => {
  for (const status of ["confirmed", "packed", "shipped"]) {
    const user = await makeUser(status);
    const product = await makeProduct(status);
    await makeOrder(user.id, product, status);

    expect(await hasPurchasedProduct(user.id, product.id)).toBe(false);
  }
});

test("a cancelled order does NOT count", async () => {
  const user = await makeUser("cancelled");
  const product = await makeProduct("cancelled");
  await makeOrder(user.id, product, "cancelled");

  expect(await hasPurchasedProduct(user.id, product.id)).toBe(false);
});

test("a refunded order does NOT count", async () => {
  const user = await makeUser("refunded");
  const product = await makeProduct("refunded");
  await makeOrder(user.id, product, "refunded");

  expect(await hasPurchasedProduct(user.id, product.id)).toBe(false);
});

test("somebody else's delivered order does NOT count", async () => {
  const buyer = await makeUser("buyer");
  const stranger = await makeUser("stranger");
  const product = await makeProduct("stranger");
  await makeOrder(buyer.id, product, DELIVERED_STATUS);

  expect(await hasPurchasedProduct(stranger.id, product.id)).toBe(false);
});

test("an order for a DIFFERENT product does not grant the review", async () => {
  const user = await makeUser("otherprod");
  const bought = await makeProduct("otherprod-bought");
  const wanted = await makeProduct("otherprod-wanted");
  await makeOrder(user.id, bought, DELIVERED_STATUS);

  expect(await hasPurchasedProduct(user.id, wanted.id)).toBe(false);
});

test("missing userId or productId is false, not a database error", async () => {
  expect(await hasPurchasedProduct(null, "abc")).toBe(false);
  expect(await hasPurchasedProduct("abc", null)).toBe(false);
  expect(await hasPurchasedProduct(undefined, undefined)).toBe(false);
});

test("a non-existent productId is false", async () => {
  const user = await makeUser("nosuch");
  expect(await hasPurchasedProduct(user.id, "does-not-exist-anywhere")).toBe(false);
});

test("DELIVERED_STATUS is the terminal-success value the gate keys on", () => {
  expect(DELIVERED_STATUS).toBe("delivered");
});
