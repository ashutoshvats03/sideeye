import { z } from "zod";

/** Longest review body accepted. Long enough for a real comment, short enough to render. */
export const REVIEW_TEXT_MAX = 2000;

/**
 * Longest product id accepted. Prisma's default `cuid()` keys are far shorter, so this is
 * only a sanity bound that keeps a huge string out of the database query.
 */
export const PRODUCT_ID_MAX = 64;

/**
 * Shape a productId must have.
 *
 * A productId is an opaque database key, so there is no legitimate form containing a slash,
 * backslash, dot, quote, space or punctuation. Restricting the charset here means a crafted
 * value cannot be carried further into the query layer at all. Existence is decided by the
 * database lookup that follows, never here.
 */
const SAFE_PRODUCT_ID = /^[A-Za-z0-9_-]+$/;

/**
 * Characters that must never survive into stored review text.
 *
 * Built with String.fromCharCode rather than escape sequences in this source: a literal
 * control byte inside a source file makes tooling treat the whole file as binary.
 *
 * Covers C0 controls, DEL, and the bidi overrides/isolates. The bidi range matters
 * because a review is displayed to other shoppers — an override can make one name or
 * price appear to be something else.
 */
const NULL = String.fromCharCode(0);
const BACKSPACE = String.fromCharCode(8);
const TAB = String.fromCharCode(9);
const LINE_FEED = String.fromCharCode(10);
const CARRIAGE_RETURN = String.fromCharCode(13);
const ESCAPE = String.fromCharCode(27);
const DELETE = String.fromCharCode(127);
const LRO = String.fromCharCode(0x202e);
const RLO = String.fromCharCode(0x202b);
const PDF = String.fromCharCode(0x202c);

/**
 * Strip characters that could corrupt or spoof the rendered review.
 *
 * Tab and newline are preserved because a multi-line comment is legitimate; they are
 * stored and rendered inside a whitespace-prewrapping element.
 *
 * @param {string} text
 * @returns {string}
 */
export function cleanReviewText(text) {
  let out = "";
  for (const char of text) {
    if (char === TAB || char === LINE_FEED) {
      out += char;
      continue;
    }
    if (char === NULL) continue;
    if (char === BACKSPACE || char === CARRIAGE_RETURN || char === ESCAPE) continue;
    if (char === DELETE) continue;
    if (char === LRO || char === RLO || char === PDF) continue;
    if (char.charCodeAt(0) < 32) continue;
    out += char;
  }
  return out;
}

/**
 * Schema for a submitted review.
 *
 * `.strip()` is the important part: zod drops unrecognised keys rather than passing
 * them on, so a client cannot smuggle `isApproved`, `userId` or `id` into the payload.
 * Approval and ownership are decided server-side, never from the request body.
 */
const reviewSchema = z.object({
  productId: z
    .string({ message: "A product is required to review." })
    .trim()
    .min(1, { message: "A product is required to review." })
    .max(PRODUCT_ID_MAX, {
      message: `Product id must be ${PRODUCT_ID_MAX} characters or fewer.`,
    })
    .refine((value) => SAFE_PRODUCT_ID.test(value), {
      message: "That product id is not valid.",
    }),
  rating: z
    .number({ message: "Rating must be a number from 1 to 5." })
    .int()
    .min(1)
    .max(5),
  text: z
    .string()
    .transform(cleanReviewText)
    .transform((value) => value.trim())
    .default("")
    .refine((value) => value.length <= REVIEW_TEXT_MAX, {
      message: `Review must be ${REVIEW_TEXT_MAX} characters or fewer.`,
    }),
});

/**
 * Validate a review submission.
 *
 * Returns a discriminated result rather than throwing, so the route can turn a failure
 * into a 400 with a message the UI can display.
 *
 * @param {unknown} input raw parsed JSON body
 * @returns {{ok: true, value: {productId: string, rating: number, text: string}}
 *          |{ok: false, error: string}}
 */
export function parseReviewInput(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Review must be an object." };
  }

  const result = reviewSchema.safeParse(input);
  if (!result.success) {
    const first = result.error.issues[0];
    return { ok: false, error: first?.message ?? "Invalid review." };
  }

  return { ok: true, value: result.data };
}