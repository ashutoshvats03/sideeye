/**
 * Cart pricing.
 *
 * Server-authoritative (spec §6, AGENTS.md e-commerce guardrails): the client never
 * supplies totals. Everything here is integer paise in, integer paise out.
 *
 * Shipping rule is the single locked config from spec §2:
 *   flat Rs.49, free above Rs.999 (inclusive).
 */

import { sumPaise } from "./money.js";

/** Flat shipping charge in paise (Rs.49). */
export const SHIPPING_FLAT_PAISE = 4900;

/** Orders at or above this subtotal ship free (Rs.999, inclusive). */
export const FREE_SHIPPING_ABOVE_PAISE = 99900;

/**
 * Sum line items into a subtotal.
 *
 * @param {{pricePaise: number, qty: number}[]} items
 * @returns {number} subtotal in paise
 */
export function computeSubtotalPaise(items) {
  let subtotal = 0;
  for (const item of items) {
    const { pricePaise, qty } = item;
    if (!Number.isInteger(pricePaise) || pricePaise < 0) {
      throw new TypeError(`invalid pricePaise: ${pricePaise}`);
    }
    if (!Number.isInteger(qty) || qty < 0) {
      throw new TypeError(`invalid qty: ${qty}`);
    }
    subtotal = sumPaise(subtotal, pricePaise * qty);
  }
  return subtotal;
}

/**
 * Is this coupon allowed to apply right now?
 *
 * Guards the review-focus rule that an expired or inactive coupon is rejected even when
 * the code string matches. Absence of the fields means "no constraint" (so hand-built
 * test objects and the plan's sample cases keep working).
 *
 * @param {{isActive?: boolean, startsAt?: Date|null, expiresAt?: Date|null}} coupon
 * @param {Date} now
 * @returns {boolean}
 */
export function isCouponUsable(coupon, now = new Date()) {
  if (!coupon) return false;
  if (coupon.isActive === false) return false;
  if (coupon.startsAt != null && now < new Date(coupon.startsAt)) return false;
  // expiresAt is exclusive: a coupon expiring exactly now is spent.
  if (coupon.expiresAt != null && now >= new Date(coupon.expiresAt)) return false;
  return true;
}

/**
 * Compute the discount for a coupon against a subtotal.
 *
 * - PERCENT: `value` is whole percentage points (20 = 20%). Computed as
 *   `Math.floor(subtotal * value / 100)`, then capped by `maxDiscountPaise` when set.
 *   `Math.floor` is the single rounding point for percentages.
 * - FLAT: `value` is paise, taken off directly.
 * - A coupon with `minOrderPaise > 0` is ignored unless the subtotal meets it.
 * - An inactive coupon, or one whose `expiresAt` has passed, is ignored even when the
 *   code string matched. Callers must not rely on the code lookup alone.
 *
 * The result is clamped to `[0, subtotal]` so a coupon can never discount more than
 * the cart is worth or produce a negative intermediate.
 *
 * @param {number} subtotalPaise
 * @param {{type: string, value: number, minOrderPaise?: number|null,
 *          maxDiscountPaise?: number|null, isActive?: boolean,
 *          startsAt?: Date|null, expiresAt?: Date|null}|null} coupon
 * @param {Date} [now] injectable for deterministic expiry tests
 * @returns {number} discount in paise, 0 when no coupon applies
 */
export function computeDiscountPaise(subtotalPaise, coupon, now = new Date()) {
  if (!coupon) return 0;
  if (!isCouponUsable(coupon, now)) return 0;

  const minOrderPaise = coupon.minOrderPaise ?? 0;
  if (subtotalPaise < minOrderPaise) return 0;

  let discount;
  if (coupon.type === "PERCENT") {
    // Integer percent: floor is the one and only rounding point.
    discount = Math.floor((subtotalPaise * coupon.value) / 100);
    if (coupon.maxDiscountPaise != null) {
      discount = Math.min(discount, coupon.maxDiscountPaise);
    }
  } else if (coupon.type === "FLAT") {
    discount = coupon.value;
  } else {
    throw new TypeError(`unsupported coupon type: ${coupon.type}`);
  }

  // Clamp: never negative, never more than the subtotal.
  return Math.max(0, Math.min(discount, subtotalPaise));
}

/**
 * Shipping charge for a post-discount amount.
 *
 * Free at or above the threshold. `discountedPaise` is used (not the raw subtotal) so a
 * coupon large enough to drop the order under the threshold correctly incurs shipping.
 *
 * Nothing to ship means no shipping charge: an empty cart, or a cart a coupon reduced to
 * zero, ships free. This is what Plan 01 Task 4's "total never negative" case pins down
 * (Rs.10 cart, Rs.50 FLAT coupon -> totalPaise 0, not Rs.49). Charging delivery on a
 * zero-value order would also be the wrong customer experience.
 *
 * @param {number} discountedPaise
 * @returns {number} shipping in paise
 */
export function computeShippingPaise(discountedPaise) {
  if (discountedPaise <= 0) return 0;
  return discountedPaise >= FREE_SHIPPING_ABOVE_PAISE ? 0 : SHIPPING_FLAT_PAISE;
}

/**
 * Full cart total. Server-side authoritative; never trust client-sent totals.
 *
 * @param {{pricePaise: number, qty: number}[]} items
 * @param {{type: string, value: number, minOrderPaise?: number|null,
 *          maxDiscountPaise?: number|null}|null} coupon
 * @returns {{subtotalPaise: number, discountPaise: number,
 *            shippingPaise: number, totalPaise: number}} all paise
 */
export function computeTotals(items, coupon, now = new Date()) {
  const subtotalPaise = computeSubtotalPaise(items);
  const discountPaise = computeDiscountPaise(subtotalPaise, coupon, now);

  // Clamp here too so a future coupon shape cannot make this negative.
  const discountedPaise = Math.max(0, subtotalPaise - discountPaise);
  const shippingPaise = computeShippingPaise(discountedPaise);

  const totalPaise = Math.max(0, discountedPaise + shippingPaise);

  return { subtotalPaise, discountPaise, shippingPaise, totalPaise };
}
