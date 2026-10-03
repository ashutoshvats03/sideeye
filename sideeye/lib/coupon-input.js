/**
 * Admin coupon input validation (pure, zod only — unit testable).
 *
 * Consumed by `actions/admin-ops.js`. Rules (Plan 05): PERCENT value 1–100,
 * FLAT value is integer paise ≥ 1, max-discount capped at a sane bound,
 * codes normalised to uppercase. Runtime checks (expiry window, usage limits)
 * stay in `lib/coupons.js`; shape checks live here.
 */

import { z } from "zod";

/** Upper bound for a capped percent discount: Rs 1,00,000. */
export const MAX_DISCOUNT_PAISE = 10000000;

/** Codes: 3–20 uppercase alphanumerics. */
export const COUPON_CODE_RE = /^[A-Z0-9]{3,20}$/;

/**
 * @param {unknown} raw
 * @returns {string} trimmed, uppercased
 */
export function normaliseCouponCode(raw) {
  return String(raw ?? "").trim().toUpperCase();
}

export const couponInputSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, "Code is required.")
      .max(20)
      .transform((s) => s.toUpperCase())
      .refine((s) => COUPON_CODE_RE.test(s), {
        message: "Code must be 3–20 letters/digits.",
      }),
    type: z.enum(["PERCENT", "FLAT"]),
    value: z.number().int("Coupon value must be an integer."),
    minOrderPaise: z.number().int().min(0).optional().default(0),
    maxDiscountPaise: z.number().int().positive().max(MAX_DISCOUNT_PAISE).nullable().optional(),
    usageLimit: z.number().int().positive().max(1000000).nullable().optional(),
    perUserLimit: z.number().int().positive().max(100).nullable().optional(),
    isActive: z.boolean().optional().default(true),
  })
  .superRefine((val, ctx) => {
    if (val.type === "PERCENT" && (val.value < 1 || val.value > 100)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["value"],
        message: "Percent must be between 1 and 100.",
      });
    }
    if (val.type === "FLAT" && val.value < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["value"],
        message: "Flat discount must be at least ₹0.01 (1 paise).",
      });
    }
    if (val.type === "FLAT" && val.value > MAX_DISCOUNT_PAISE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["value"],
        message: "Flat discount is above the sane cap.",
      });
    }
  });

/**
 * @param {unknown} input
 * @returns {{ok: true, data: object} | {ok: false, error: string}}
 */
export function validateCouponInput(input) {
  const parsed = couponInputSchema.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };
  return {
    ok: false,
    error: parsed.error.issues[0]?.message || "Invalid coupon.",
  };
}
