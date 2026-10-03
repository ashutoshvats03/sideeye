import { z } from "zod";

/**
 * Profile input validation (pure, unit-testable).
 *
 * DOB arrives from the form as "YYYY-MM-DD" (or blank = absent). It must be a
 * real calendar date and never in the future. Phone is optional; when present
 * it must be exactly 10 digits (spec Task 3; the stricter Indian-mobile rule
 * lives on the checkout/address path, which feeds real orders).
 */

const blankToUndefined = (v) => (typeof v === "string" && v.trim() === "" ? undefined : v);

const dobSchema = z.preprocess(
  blankToUndefined,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date of birth.")
    .refine((s) => {
      const d = new Date(`${s}T00:00:00Z`);
      if (Number.isNaN(d.getTime())) return false;
      // Reject overflow dates like 2026-02-30, which Date silently rolls over.
      if (d.toISOString().slice(0, 10) !== s) return false;
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      return d.getTime() <= today.getTime();
    }, "Date of birth cannot be in the future.")
    .optional(),
);

const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80),
  dob: dobSchema,
  phone: z.preprocess(
    blankToUndefined,
    z
      .string()
      .trim()
      .regex(/^\d{10}$/, "Enter a valid 10-digit phone number.")
      .optional(),
  ),
});

/**
 * @param {unknown} input
 * @returns {{ok: true, data: {name: string, dob?: string, phone?: string}} | {ok: false, error: string}}
 */
export function validateProfileInput(input) {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Invalid profile." };
  }
  return { ok: true, data: parsed.data };
}
