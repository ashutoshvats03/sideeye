import { z } from "zod";

/**
 * Saved-address input validation (pure, unit-testable).
 *
 * Field rules mirror the checkout `addressSchema` (actions/checkout.js) on
 * purpose: a saved address feeds real orders, so it must already satisfy the
 * order-time checks — 6-digit pincode, Indian 10-digit mobile. The checkout
 * file keeps its own inline copy (no drive-by refactor); if either changes,
 * the other must be updated to match.
 */

const blankToUndefined = (v) => (typeof v === "string" && v.trim() === "" ? undefined : v);

const addressSchema = z.object({
  label: z.preprocess(
    blankToUndefined,
    z.string().trim().max(30, "Label must be 30 characters or less.").optional(),
  ),
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

/**
 * @param {unknown} input
 * @returns {{ok: true, data: object} | {ok: false, error: string}}
 */
export function validateAddressInput(input) {
  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Invalid address." };
  }
  return { ok: true, data: parsed.data };
}
