/**
 * Pure order-placement helpers.
 *
 * Kept free of Prisma and of any I/O so the money and stock rules that decide what a
 * shopper is charged can be unit-tested without a database. The transactional
 * `placeOrder` action in `actions/checkout.js` composes these with Prisma.
 *
 * Money rule (spec §2, AGENTS.md): every amount is integer paise. The client sends only
 * `{ slug, qty }`; prices are re-read from the database server-side, so a tampered or
 * stale cart can never change the charge.
 */

import { MAX_QTY_PER_LINE } from "./cart.js";

/** Prefix on every human-facing order number. */
export const ORDER_NUMBER_PREFIX = "SE-";

/** Characters after the prefix. Excludes 0/O and 1/I/L so a number read aloud or
 *  typed from a parcel can never be misread. */
const ORDER_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Length of the random part of an order number. */
export const ORDER_NUMBER_LENGTH = 8;

/** Slug shape — must match the one enforced on cart lines. */
const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Coerce a client-supplied quantity into a safe integer.
 *
 * The cart is browser-local and editable, so qty can arrive as a string, a float, a
 * negative, `null` or a non-number. Anything unusable becomes 1 rather than being
 * rejected, because a shopper who clearly wanted a piece should not be blocked by a
 * malformed value — and the real stock cap is applied separately against the database.
 *
 * @param {unknown} raw
 * @returns {number} integer in [1, MAX_QTY_PER_LINE]
 */
export function normaliseClientQty(raw) {
  let n = raw;
  if (typeof n === "string") n = Number(n.trim());
  if (typeof n !== "number" || !Number.isFinite(n)) return 1;
  n = Math.floor(n);
  if (n < 1) return 1;
  if (n > MAX_QTY_PER_LINE) return MAX_QTY_PER_LINE;
  return n;
}

/**
 * Normalise the cart payload that arrives at checkout.
 *
 * This is the trust boundary. Only `slug` and `qty` survive; anything else a client
 * smuggles in (price, name, stock, a second copy of a line) is dropped here, before it
 * can reach a query or a total.
 *
 * @param {unknown} items
 * @returns {{slug: string, qty: number}[]}
 */
export function normaliseCheckoutItems(items) {
  if (!Array.isArray(items)) return [];

  const out = [];
  for (const line of items) {
    if (!line || typeof line !== "object") continue;
    const { slug } = line;
    if (typeof slug !== "string") continue;
    if (!SAFE_SLUG.test(slug)) continue;
    out.push({ slug, qty: normaliseClientQty(line.qty) });
  }
  return out;
}

/**
 * Build a human-facing order number, e.g. `SE-8K2M4Q7P`.
 *
 * Uses `crypto.getRandomValues` (CSPRNG) rather than `Math.random`, so order numbers
 * are not guessable from earlier ones.
 *
 * @returns {string}
 */
export function buildOrderNumber() {
  const chars = new Uint32Array(ORDER_NUMBER_LENGTH);
  crypto.getRandomValues(chars);
  let suffix = "";
  for (let i = 0; i < ORDER_NUMBER_LENGTH; i++) {
    suffix += ORDER_ALPHABET[chars[i] % ORDER_ALPHABET.length];
  }
  return `${ORDER_NUMBER_PREFIX}${suffix}`;
}
