import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { getCurrentUser } from "../lib/guards.js";
import { validateCoupon, CouponError } from "../lib/coupons.js";
import { computeTotals } from "../lib/pricing.js";
import { normaliseCheckoutItems, buildOrderNumber } from "../lib/order-core.js";
import { checkRateLimit } from "../lib/rate-limit.js";

/**
 * Checkout server actions.
 *
 * Money rule (spec §2, AGENTS.md): the client sends ONLY `{ slug, qty }` lines. Every
 * price is re-read from the database here, so a stale or hand-edited cart can never
 * change what the shopper is charged. Client totals are display-only.
 *
 * Stock rule: atomic conditional decrement (`stockQty >= qty`), never read-then-write.
 * Two simultaneous last-item checkouts cannot both succeed.
 */

const addressSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number."),
  line1: z.string().trim().min(1, "Address is required.").max(120),
  line2: z.string().trim().max(120).optional().default(""),
  city: z.string().trim().min(1, "City is required.").max(60),
  state: z.string().trim().min(1, "State is required.").max(60),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter a valid 6-digit pincode."),
});

const placeOrderSchema = z.object({
  items: z
    .array(
      z.object({
        slug: z.string().trim().min(1),
        qty: z.number().int().min(1).max(10),
      }),
    )
    .min(1, "Your bag is empty.")
    .max(50),
  addressId: z.string().trim().optional(),
  address: addressSchema.optional(),
  couponCode: z.string().trim().max(50).optional().default(""),
  idempotencyKey: z
    .string()
    .trim()
    .min(16, "Invalid idempotency key.")
    .max(64)
    .optional(),
});

/**
 * Place a COD order.
 *
 * @param {{items: {slug: string, qty: number}[], addressId?: string,
 *          address?: object, couponCode?: string, idempotencyKey?: string}} input
 * @returns {Promise<{ok: true, orderNumber: string} | {ok: false, error: string}>}
 */
export async function placeOrder(input) {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Please sign in to place an order." };
  }

  // Rate limit: 5 orders per minute per user.
  const rl = checkRateLimit(`place-order:${user.id}`);
  if (!rl.allowed) {
    return {
      ok: false,
      error: `Too many attempts. Please wait ${Math.ceil(rl.retryAfterMs / 1000)}s and try again.`,
    };
  }

  const parsed = placeOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || "Invalid order." };
  }

  const { items: rawItems, addressId, address, couponCode, idempotencyKey } =
    parsed.data;

  // Trust boundary: only slug + qty survive. Prices come from the DB below.
  const items = normaliseCheckoutItems(rawItems);
  if (items.length === 0) {
    return { ok: false, error: "Your bag is empty." };
  }

  // Idempotency: if this key was already used, return the original order.
  if (idempotencyKey) {
    const existing = await prisma.order.findUnique({
      where: { idempotencyKey },
      select: { number: true },
    });
    if (existing) {
      return { ok: true, orderNumber: existing.number };
    }
  }

  // Resolve address: either an existing saved address or a new one.
  let addressSnapshot;
  if (addressId) {
    const saved = await prisma.address.findFirst({
      where: { id: addressId, userId: user.id },
    });
    if (!saved) {
      return { ok: false, error: "Address not found." };
    }
    addressSnapshot = {
      label: saved.label ?? "Delivery",
      name: saved.name,
      phone: saved.phone,
      line1: saved.line1,
      line2: saved.line2 ?? "",
      city: saved.city,
      state: saved.state,
      pincode: saved.pincode,
    };
  } else if (address) {
    addressSnapshot = {
      label: "Delivery",
      ...address,
      line2: address.line2 ?? "",
    };
  } else {
    return { ok: false, error: "Please provide a delivery address." };
  }

  // Re-read prices from the DB. Never trust the client.
  const slugs = items.map((i) => i.slug);
  const products = await prisma.product.findMany({
    where: { slug: { in: slugs }, isActive: true },
    select: { id: true, slug: true, name: true, pricePaise: true, mrpPaise: true, stockQty: true, images: true },
  });

  const productMap = new Map(products.map((p) => [p.slug, p]));
  const lines = [];
  for (const item of items) {
    const product = productMap.get(item.slug);
    if (!product) {
      return { ok: false, error: `"${item.slug}" is no longer available.` };
    }
    if (product.stockQty < item.qty) {
      return {
        ok: false,
        error: `Only ${product.stockQty} left of "${product.name}".`,
      };
    }
    lines.push({
      productId: product.id,
      nameSnapshot: product.name,
      pricePaise: product.pricePaise,
      mrpPaise: product.mrpPaise,
      qty: item.qty,
      imageSnapshot: product.images[0] ?? null,
    });
  }

  // Validate coupon against the real subtotal.
  let coupon = null;
  let userCoupon = null;
  if (couponCode) {
    const subtotalPaise = lines.reduce((s, l) => s + l.pricePaise * l.qty, 0);
    coupon = await prisma.coupon.findUnique({ where: { code: couponCode } });
    if (!coupon) {
      return { ok: false, error: "Coupon not found." };
    }
    if (coupon.perUserLimit != null) {
      userCoupon = await prisma.userCoupon.findUnique({
        where: { userId_couponId: { userId: user.id, couponId: coupon.id } },
      });
    }
    try {
      validateCoupon({
        code: couponCode,
        userId: user.id,
        subtotalPaise,
        coupon,
        userCoupon,
      });
    } catch (err) {
      if (err instanceof CouponError) {
        return { ok: false, error: err.message };
      }
      throw err;
    }
  }

  // Compute totals server-side.
  const subtotalPaise = lines.reduce((s, l) => s + l.pricePaise * l.qty, 0);
  const totals = computeTotals(
    lines.map((l) => ({ pricePaise: l.pricePaise, qty: l.qty })),
    coupon
      ? {
          type: coupon.type,
          value: coupon.value,
          minOrderPaise: coupon.minOrderPaise,
          maxDiscountPaise: coupon.maxDiscountPaise,
        }
      : null,
  );

  // Generate order number.
  const orderNumber = buildOrderNumber();

  // Execute in a single transaction: atomic stock decrement + order creation.
  try {
    await prisma.$transaction(async (tx) => {
      // Atomic decrement: stockQty >= qty is checked by the DB.
      for (const line of lines) {
        const result = await tx.product.updateMany({
          where: { id: line.productId, stockQty: { gte: line.qty } },
          data: { stockQty: { decrement: line.qty } },
        });
        if (result.count === 0) {
          throw new Error(`OUT_OF_STOCK:${line.productId}`);
        }
      }

      // Create the order.
      await tx.order.create({
        data: {
          number: orderNumber,
          userId: user.id,
          status: "pending",
          paymentMethod: "COD",
          paymentStatus: "pending",
          subtotalPaise: totals.subtotalPaise,
          discountPaise: totals.discountPaise,
          shippingPaise: totals.shippingPaise,
          totalPaise: totals.totalPaise,
          couponId: coupon?.id ?? null,
          idempotencyKey: idempotencyKey ?? null,
          addressSnapshot,
          timeline: [{ status: "pending", at: new Date().toISOString(), note: "Order placed" }],
          items: {
            create: lines.map((l) => ({
              productId: l.productId,
              nameSnapshot: l.nameSnapshot,
              pricePaise: l.pricePaise,
              mrpPaise: l.mrpPaise,
              qty: l.qty,
              imageSnapshot: l.imageSnapshot,
            })),
          },
        },
      });

      // Bump coupon usage.
      if (coupon) {
        await tx.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        });
        if (userCoupon) {
          await tx.userCoupon.update({
            where: { id: userCoupon.id },
            data: { useCount: { increment: 1 } },
          });
        }
      }
    });
  } catch (err) {
    if (err.message?.startsWith("OUT_OF_STOCK:")) {
      const productId = err.message.split(":")[1];
      const product = products.find((p) => p.id === productId);
      return {
        ok: false,
        error: `Sorry, "${product?.name ?? "an item"}" just sold out. Please try again.`,
      };
    }
    console.error("placeOrder failed", { code: err?.code, message: err?.message });
    return { ok: false, error: "Something went wrong. Please try again." };
  }

  return { ok: true, orderNumber };
}

const cancelOrderSchema = z.object({
  orderId: z.string().trim().min(1),
});

/**
 * Cancel a COD order. Restores stock and coupon usage in the same transaction.
 *
 * @param {{orderId: string}} input
 * @returns {Promise<{ok: true} | {ok: false, error: string}>}
 */
export async function cancelOrder(input) {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Please sign in." };
  }

  const parsed = cancelOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid order." };
  }

  const { orderId } = parsed.data;

  // Owner-only: User A cannot cancel User B's order.
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: user.id },
    include: { items: true },
  });
  if (!order) {
    return { ok: false, error: "Order not found." };
  }

  if (!["pending", "confirmed"].includes(order.status)) {
    return { ok: false, error: "This order can no longer be cancelled." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Restore stock atomically.
      for (const item of order.items) {
        await tx.product.updateMany({
          where: { id: item.productId },
          data: { stockQty: { increment: item.qty } },
        });
      }

      // Return coupon usage.
      if (order.couponId) {
        await tx.coupon.update({
          where: { id: order.couponId },
          data: { usedCount: { decrement: 1 } },
        });
      }

      // Set status to cancelled.
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "cancelled",
          timeline: [
            ...(order.timeline ?? []),
            { status: "cancelled", at: new Date().toISOString(), note: "Cancelled by customer" },
          ],
        },
      });
    });
  } catch (err) {
    console.error("cancelOrder failed", { code: err?.code, message: err?.message });
    return { ok: false, error: "Something went wrong. Please try again." };
  }

  return { ok: true };
}