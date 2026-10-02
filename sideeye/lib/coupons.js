/**
 * Coupon validation.
 *
 * Pure function — takes the Coupon and UserCoupon rows (already fetched from the DB by
 * the caller) plus the current cart subtotal, and either returns the coupon or throws a
 * `CouponError` with a machine-readable code.
 *
 * Validation order (first failure wins):
 *   1. NOT_FOUND   — no coupon row for this code
 *   2. INACTIVE    — isActive false, or startsAt in the future
 *   3. EXPIRED     — expiresAt in the past (or exactly now)
 *   4. MIN_ORDER   — subtotal below minOrderPaise
 *   5. NOT_ASSIGNED — per-user coupon but no UserCoupon row for this user
 *   6. LIMIT_REACHED — usageLimit or perUserLimit exhausted
 *
 * A coupon is "per-user" when `perUserLimit` is set. Generic coupons (no perUserLimit)
 * are tracked only by `Coupon.usedCount` against `Coupon.usageLimit`.
 */

export class CouponError extends Error {
  /**
   * @param {'NOT_FOUND'|'INACTIVE'|'EXPIRED'|'MIN_ORDER'|'LIMIT_REACHED'|'NOT_ASSIGNED'} code
   * @param {string} message
   */
  constructor(code, message) {
    super(message);
    this.name = "CouponError";
    this.code = code;
  }
}

/**
 * Validate a coupon against the current cart.
 *
 * @param {object} params
 * @param {string} params.code  The coupon code as typed by the shopper.
 * @param {string} params.userId  The current user's id (for per-user checks).
 * @param {number} params.subtotalPaise  Cart subtotal in integer paise.
 * @param {object|null} params.coupon  The Coupon row from the DB, or null if not found.
 * @param {object|null} [params.userCoupon]  The UserCoupon row for this user+coupon, or null.
 * @param {Date} [params.now]  Injectable clock for deterministic tests.
 * @returns {object} The validated coupon row.
 * @throws {CouponError}
 */
export function validateCoupon({
  code,
  userId,
  subtotalPaise,
  coupon,
  userCoupon = null,
  now = new Date(),
}) {
  if (!coupon) {
    throw new CouponError("NOT_FOUND", "That code is not a valid coupon.");
  }

  if (!coupon.isActive) {
    throw new CouponError("INACTIVE", "That coupon is no longer active.");
  }

  if (coupon.startsAt != null && now < new Date(coupon.startsAt)) {
    throw new CouponError("INACTIVE", "That coupon is not active yet.");
  }

  if (coupon.expiresAt != null && now >= new Date(coupon.expiresAt)) {
    throw new CouponError("EXPIRED", "That coupon has expired.");
  }

  const minOrderPaise = coupon.minOrderPaise ?? 0;
  if (subtotalPaise < minOrderPaise) {
    throw new CouponError(
      "MIN_ORDER",
      `That coupon needs a minimum order of ₹${(minOrderPaise / 100).toFixed(2)}.`,
    );
  }

  const isPerUser = coupon.perUserLimit != null;

  if (isPerUser) {
    if (!userCoupon || userCoupon.userId !== userId) {
      throw new CouponError(
        "NOT_ASSIGNED",
        "That coupon is not available for your account.",
      );
    }
    if (userCoupon.useCount >= coupon.perUserLimit) {
      throw new CouponError(
        "LIMIT_REACHED",
        "You have already used that coupon.",
      );
    }
  }

  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    throw new CouponError(
      "LIMIT_REACHED",
      "That coupon has been fully redeemed.",
    );
  }

  return coupon;
}

/**
 * Default coupon expiry: exactly 5 days after `startsAt`.
 *
 * Prisma cannot express a relative column default (`expiresAt = startsAt + 5d`),
 * so every coupon-creation path (seeds, admin) must set `expiresAt` via this
 * helper instead of leaving it null. The column is NOT NULL; null from old rows
 * was backfilled to `startsAt + 5 days`.
 *
 * @param {Date|string} [startsAt] defaults to now
 * @returns {Date} startsAt + 5 days
 */
export function defaultCouponExpiry(startsAt = new Date()) {
  const start = new Date(startsAt);
  return new Date(start.getTime() + 5 * 24 * 60 * 60 * 1000);
}
