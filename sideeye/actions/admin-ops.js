"use server";

/**
 * Admin operations: orders, coupons, reviews, users.
 *
 * Every action re-checks `role === "admin"` server-side via the DB-backed
 * session user — a non-admin POSTing straight at these gets `{ ok: false }`.
 * Every status write goes through `lib/order-status.js`; cancel/refund
 * restores stock + coupon usage in the same transaction (Plan 04 logic).
 */

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "../lib/prisma.js";
import { getCurrentUser } from "../lib/guards.js";
import { isAdminRole } from "../lib/roles.js";
import {
  canTransition,
  isOrderStatus,
  legalTargets,
} from "../lib/order-status.js";
import { validateCouponInput } from "../lib/coupon-input.js";
import { defaultCouponExpiry } from "../lib/coupons.js";

async function requireAdminAction() {
  const user = await getCurrentUser();
  if (!user || !isAdminRole(user.role)) {
    return { error: "Forbidden." };
  }
  return { user };
}

function timelineAppend(timeline, status, note) {
  const list = Array.isArray(timeline) ? timeline : [];
  return [...list, { status, at: new Date().toISOString(), note }];
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

const setOrderStatusSchema = z.object({
  orderId: z.string().trim().min(1),
  to: z.string().trim().min(1),
  note: z.string().trim().max(200).optional().default(""),
});

/**
 * Move an order to a new status. Illegal jumps (e.g. delivered → pending)
 * are refused with the legal moves named. Cancelling/refunding restores
 * stock and coupon usage in the same transaction.
 */
export async function setOrderStatus(input) {
  const gate = await requireAdminAction();
  if (gate.error) return { ok: false, error: gate.error };

  const parsed = setOrderStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid status change." };
  const { orderId, to, note } = parsed.data;

  if (!isOrderStatus(to)) return { ok: false, error: `Unknown status "${to}".` };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return { ok: false, error: "Order not found." };

  if (!canTransition(order.status, to)) {
    const legal = legalTargets(order.status);
    const hint = legal.length > 0 ? `Legal: ${legal.join(", ")}.` : "No moves are legal.";
    return {
      ok: false,
      error: `Cannot move order from "${order.status}" to "${to}". ${hint}`,
    };
  }

  const restoresStock = to === "cancelled" || to === "refunded";

  try {
    await prisma.$transaction(async (tx) => {
      if (restoresStock) {
        for (const item of order.items) {
          if (!item.productId) continue;
          await tx.product.updateMany({
            where: { id: item.productId },
            data: { stockQty: { increment: item.qty } },
          });
        }
        if (order.couponId) {
          // Guarded so a double-restore can never drive usedCount negative.
          await tx.coupon.updateMany({
            where: { id: order.couponId, usedCount: { gt: 0 } },
            data: { usedCount: { decrement: 1 } },
          });
        }
      }
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: to,
          ...(to === "refunded" ? { paymentStatus: "refunded" } : {}),
          timeline: timelineAppend(
            order.timeline,
            to,
            note || `Marked ${to} by admin`,
          ),
        },
      });
    });
  } catch (err) {
    console.error("setOrderStatus failed", { code: err?.code, message: err?.message });
    return { ok: false, error: "Something went wrong. Please try again." };
  }

  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Coupons
// ---------------------------------------------------------------------------

/**
 * Create a coupon. Validity window is exactly 5 days from now
 * (see defaultCouponExpiry in lib/coupons.js).
 */
export async function createCoupon(input) {
  const gate = await requireAdminAction();
  if (gate.error) return { ok: false, error: gate.error };

  const checked = validateCouponInput(input);
  if (!checked.ok) return { ok: false, error: checked.error };

  const clash = await prisma.coupon.findUnique({ where: { code: checked.data.code } });
  if (clash) return { ok: false, error: "That code is already in use." };

  const created = await prisma.coupon.create({
    data: {
      ...checked.data,
      startsAt: new Date(),
      expiresAt: defaultCouponExpiry(),
    },
  });
  revalidatePath("/admin/coupons");
  return { ok: true, id: created.id };
}

/**
 * Edit a coupon. The code itself is immutable (it may already be on
 * screenshots and parcels); everything else can change.
 */
export async function updateCoupon(input) {
  const gate = await requireAdminAction();
  if (gate.error) return { ok: false, error: gate.error };

  const { id, ...rest } = input ?? {};
  if (typeof id !== "string" || !id) return { ok: false, error: "Invalid coupon." };

  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Coupon not found." };

  const checked = validateCouponInput({ ...rest, code: existing.code });
  if (!checked.ok) return { ok: false, error: checked.error };
  const { code: _code, ...data } = checked.data;

  await prisma.coupon.update({ where: { id }, data });
  revalidatePath("/admin/coupons");
  return { ok: true };
}

const couponIdSchema = z.object({
  id: z.string().trim().min(1),
  isActive: z.boolean(),
});

export async function setCouponActive(input) {
  const gate = await requireAdminAction();
  if (gate.error) return { ok: false, error: gate.error };

  const parsed = couponIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid coupon." };

  const existing = await prisma.coupon.findUnique({ where: { id: parsed.data.id } });
  if (!existing) return { ok: false, error: "Coupon not found." };

  await prisma.coupon.update({
    where: { id: existing.id },
    data: { isActive: parsed.data.isActive },
  });
  revalidatePath("/admin/coupons");
  return { ok: true };
}

const assignCouponSchema = z.object({
  couponId: z.string().trim().min(1),
  userEmail: z.string().trim().min(1).max(254),
});

/**
 * Assign a coupon to one user (personal coupon). Creates the UserCoupon row
 * the checkout validator requires for per-user coupons.
 */
export async function assignCouponToUser(input) {
  const gate = await requireAdminAction();
  if (gate.error) return { ok: false, error: gate.error };

  const parsed = assignCouponSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid assignment." };

  const coupon = await prisma.coupon.findUnique({
    where: { id: parsed.data.couponId },
    select: { id: true, code: true },
  });
  if (!coupon) return { ok: false, error: "Coupon not found." };

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.userEmail.trim() },
    select: { id: true, email: true, isActive: true },
  });
  if (!user) return { ok: false, error: "No user with that email." };
  if (!user.isActive) return { ok: false, error: "That user is deactivated." };

  await prisma.userCoupon.upsert({
    where: { userId_couponId: { userId: user.id, couponId: coupon.id } },
    create: { userId: user.id, couponId: coupon.id, useCount: 0 },
    update: {},
  });
  revalidatePath("/admin/coupons");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

const reviewApprovalSchema = z.object({
  id: z.string().trim().min(1),
  isApproved: z.boolean(),
});

/**
 * Approve or reject a review. Approval makes it visible on the product page
 * (only approved reviews render — until this ran, submissions sat invisible).
 */
export async function setReviewApproval(input) {
  const gate = await requireAdminAction();
  if (gate.error) return { ok: false, error: gate.error };

  const parsed = reviewApprovalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid review." };

  const existing = await prisma.review.findUnique({
    where: { id: parsed.data.id },
    include: { product: { select: { slug: true } } },
  });
  if (!existing) return { ok: false, error: "Review not found." };

  await prisma.review.update({
    where: { id: existing.id },
    data: { isApproved: parsed.data.isApproved },
  });
  if (existing.product?.slug) revalidatePath(`/product/${existing.product.slug}`);
  revalidatePath("/admin/reviews");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

const userActiveSchema = z.object({
  id: z.string().trim().min(1),
  isActive: z.boolean(),
});

/**
 * Activate/deactivate a user. Guards re-read the row on every request, so
 * deactivation blocks the next request immediately. Self-deactivation is
 * refused — an admin must not lock themselves out by accident.
 */
export async function setUserActive(input) {
  const gate = await requireAdminAction();
  if (gate.error) return { ok: false, error: gate.error };

  const parsed = userActiveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid user." };

  if (parsed.data.id === gate.user.id && parsed.data.isActive === false) {
    return { ok: false, error: "You cannot deactivate your own admin account." };
  }

  const existing = await prisma.user.findUnique({ where: { id: parsed.data.id } });
  if (!existing) return { ok: false, error: "User not found." };

  await prisma.user.update({
    where: { id: existing.id },
    data: { isActive: parsed.data.isActive },
  });
  revalidatePath("/admin/users");
  return { ok: true };
}
