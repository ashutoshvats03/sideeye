/**
 * Admin product input validation (pure, zod only — unit testable).
 *
 * Consumed by `actions/admin-products.js`. Money rule (spec §2): price/mrp are
 * integer paise, never floats. Stock can never go negative. Slugs must stay
 * URL-safe and unique (uniqueness is checked against the DB in the action;
 * shape is checked here). Vibes are restricted to the five locked tags
 * (spec §7): anything else is dropped by rejection, not silently ignored.
 */

import { z } from "zod";
import { PRODUCT_VIBES } from "./catalog.js";

/** URL-safe slug: lowercase alphanumerics separated by single dashes. */
export const PRODUCT_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Sane upper bound for a single jewellery piece: Rs 10,00,000. */
export const MAX_PRICE_PAISE = 100000000;

const imagePathSchema = z
  .string()
  .trim()
  .min(1)
  .max(300)
  .refine((s) => s.startsWith("/") && !s.includes(".."), {
    message: "Image must be a site-relative path.",
  });

export const productInputSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required.").max(120),
    slug: z
      .string()
      .trim()
      .min(1, "Slug is required.")
      .max(120)
      .regex(PRODUCT_SLUG_RE, "Slug must be lowercase words separated by dashes."),
    description: z.string().trim().min(1, "Description is required.").max(5000),
    care: z.string().trim().max(2000).optional().default(""),
    materials: z.string().trim().max(2000).optional().default(""),
    pricePaise: z
      .number()
      .int("Price must be integer paise.")
      .min(1, "Price must be at least ₹0.01.")
      .max(MAX_PRICE_PAISE),
    mrpPaise: z
      .number()
      .int("MRP must be integer paise.")
      .min(1)
      .max(MAX_PRICE_PAISE)
      .nullable()
      .optional(),
    stockQty: z.number().int().min(0, "Stock cannot be negative.").max(100000),
    categoryId: z.string().trim().min(1, "Category is required."),
    vibes: z
      .array(z.enum(PRODUCT_VIBES))
      .max(5)
      .optional()
      .default([]),
    tags: z
      .array(z.string().trim().min(1).max(30))
      .max(20)
      .optional()
      .default([]),
    images: z.array(imagePathSchema).max(10).optional().default([]),
    isActive: z.boolean().optional().default(true),
  })
  .superRefine((val, ctx) => {
    if (val.mrpPaise != null && val.mrpPaise < val.pricePaise) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mrpPaise"],
        message: "MRP cannot be below the selling price.",
      });
    }
  });

/**
 * @param {unknown} input
 * @returns {{ok: true, data: object} | {ok: false, error: string}}
 */
export function validateProductInput(input) {
  const parsed = productInputSchema.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };
  return {
    ok: false,
    error: parsed.error.issues[0]?.message || "Invalid product.",
  };
}
