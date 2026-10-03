import { z } from "zod";

/**
 * Contact-form input validation (pure, unit-testable).
 *
 * The form never looks up an account: it only validates shape and shows the
 * same confirmation to everyone, so submissions cannot leak whether an email
 * is registered. The message is handed to the shopper's own mail app via
 * `mailto:` — no ticket store, no PII at rest (Plan 06 architecture).
 */

const blankToUndefined = (v) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80),
  email: z.string().trim().email("Enter a valid email address.").max(254),
  orderNumber: z.preprocess(
    blankToUndefined,
    z
      .string()
      .trim()
      .regex(/^SE-[A-Z0-9]{8}$/i, "Order numbers look like SE-XXXXXXXX.")
      .optional(),
  ),
  message: z
    .string()
    .trim()
    .min(20, "Tell us a little more (20 characters minimum).")
    .max(2000, "Keep it under 2000 characters."),
});

/**
 * @param {unknown} input
 * @returns {{ok: true, data: {name: string, email: string, orderNumber: string|undefined, message: string}} | {ok: false, error: string}}
 */
export function validateContactInput(input) {
  const parsed = contactSchema.safeParse(input ?? {});
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  return { ok: true, data: parsed.data };
}
