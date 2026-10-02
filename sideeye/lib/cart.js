/**
 * Cart state — BINDING FORMAT, consumed by Plan 04 (cart page + checkout).
 *
 * The serialised cart is exactly `[{ slug, qty }]`. Nothing else is persisted: no
 * price, no stock, no name. Those are re-read from the database server-side at
 * checkout, so a stale or hand-edited cart can never change what the shopper is
 * charged (AGENTS.md: never trust prices or totals from the client).
 *
 * This module is PURE and browser-agnostic — it never touches `localStorage` itself.
 * `lib/cart-storage.js` owns that. Keeping the maths pure is what makes it testable
 * and what lets the same functions run during server render.
 */

/** Hard ceiling on a single line, independent of stock. Stops a runaway cart. */
export const MAX_QTY_PER_LINE = 10;

/**
 * A cart slug is used to build `/product/${slug}` URLs, so it must be a plain
 * lowercase slug. Rejecting anything else here means a hand-edited localStorage value
 * cannot smuggle `../admin` or `javascript:` into a rendered href.
 */
const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Coerce a stored qty into a usable integer in [1, MAX_QTY_PER_LINE].
 *
 * localStorage is user-writable, so a qty can arrive as a string, a negative, a
 * float, or Infinity. Everything that is not a finite number is treated as 1 rather
 * than propagated — a NaN qty would render "NaN" in the cart summary.
 *
 * @param {unknown} raw
 * @returns {number} an integer in [1, MAX_QTY_PER_LINE]
 */
function normaliseQty(raw) {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return 1;
  const whole = Math.floor(n);
  if (whole < 1) return 1;
  return Math.min(whole, MAX_QTY_PER_LINE);
}

/**
 * Clamp against available stock.
 *
 * `maxQty` is the product's `stockQty`. A shopper can never hold more of a line than
 * exists. Note this is a UX guard only — Plan 04 re-checks stock in the database
 * inside the order transaction, because stock can change between render and checkout.
 *
 * @param {number} qty
 * @param {{maxQty?: number|null}} [options]
 * @returns {number}
 */
function applyStockCap(qty, options) {
  const cap = options?.maxQty;
  if (typeof cap !== "number" || !Number.isFinite(cap) || cap < 1) return qty;
  return Math.min(qty, Math.floor(cap));
}

/**
 * True when the caller reports no sellable stock.
 *
 * `maxQty` models the product's `stockQty`. A finite value below 1 means there is
 * nothing to hold, so adding must not create a line and an absolute set must drop
 * the line instead of writing a qty the shelf cannot back. `null`/`undefined` (and
 * any non-finite value) means "no stock information" and is NOT out of stock —
 * the cap simply does not apply.
 *
 * @param {{maxQty?: number|null}} [options]
 * @returns {boolean}
 */
function isOutOfStock(options) {
  const cap = options?.maxQty;
  return typeof cap === "number" && Number.isFinite(cap) && cap < 1;
}

/** True when a value is shaped like a usable cart line. */
function isValidLine(line) {
  return (
    line !== null &&
    typeof line === "object" &&
    !Array.isArray(line) &&
    typeof line.slug === "string" &&
    SAFE_SLUG.test(line.slug)
  );
}

/**
 * Parse a raw localStorage value into a trustworthy cart.
 *
 * Total tolerance by design: anything unrecognised is dropped rather than thrown, so a
 * corrupted or hostile cart degrades to "empty" instead of breaking the shop page.
 * Duplicate slugs are summed and every qty is clamped, so the result is always safe to
 * render and safe to send to the server.
 *
 * @param {string|null|undefined} raw JSON text from storage
 * @returns {{slug: string, qty: number}[]}
 */
export function parseCart(raw) {
  if (typeof raw !== "string" || raw.length === 0) return [];

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  const bySlug = new Map();
  for (const line of parsed) {
    if (!isValidLine(line)) continue;
    const qty = normaliseQty(line.qty);
    bySlug.set(line.slug, (bySlug.get(line.slug) ?? 0) + qty);
  }

  return [...bySlug].map(([slug, qty]) => ({
    slug,
    qty: Math.min(qty, MAX_QTY_PER_LINE),
  }));
}

/**
 * Serialise a cart for storage. Only `slug` and `qty` are written, so no other field
 * can ever reach storage even if a caller passes an enriched object.
 *
 * @param {{slug: string, qty: number}[]} cart
 * @returns {string}
 */
export function serializeCart(cart) {
  if (!Array.isArray(cart)) return "[]";
  const safe = cart
    .filter(isValidLine)
    .map((line) => ({ slug: line.slug, qty: normaliseQty(line.qty) }));
  return JSON.stringify(safe);
}

/**
 * Add `qty` of `slug`, merging into an existing line rather than duplicating it.
 *
 * @param {{slug: string, qty: number}[]} cart
 * @param {string} slug
 * @param {number} [qty]
 * @param {{maxQty?: number|null}} [options] `maxQty` caps at available stock
 * @returns {{slug: string, qty: number}[]} a new cart; the input is not mutated
 */
export function addToCart(cart, slug, qty = 1, options) {
  const lines = Array.isArray(cart) ? cart : [];
  // Nothing on the shelf: do not create a line and do not grow an existing one.
  // The sold-out UI already hides the button; this is the programmatic backstop.
  if (isOutOfStock(options)) return lines;
  const added = normaliseQty(qty);
  const existing = lines.find((line) => line?.slug === slug);

  if (!existing) {
    const created = { slug, qty: applyStockCap(added, options) };
    return [...lines, created];
  }

  return setQty(lines, slug, normaliseQty(existing.qty) + added, options);
}

/**
 * Set the quantity of one line. An unknown slug is a no-op rather than a new line —
 * callers decide what a missing line means, and every current caller means "absent".
 *
 * @param {{slug: string, qty: number}[]} cart
 * @param {string} slug
 * @param {number} qty
 * @param {{maxQty?: number|null}} [options]
 * @returns {{slug: string, qty: number}[]}
 */
export function setQty(cart, slug, qty, options) {
  const lines = Array.isArray(cart) ? cart : [];
  // An absolute set against zero stock drops the line: a qty the shelf cannot back
  // must not persist. Unknown slugs stay a no-op either way.
  if (isOutOfStock(options)) {
    return lines.filter((line) => line?.slug !== slug);
  }
  const next = normaliseQty(qty);
  return lines.map((line) =>
    line?.slug === slug
      ? { slug, qty: applyStockCap(next, options) }
      : { slug: line.slug, qty: line.qty },
  );
}

/**
 * Drop a line entirely.
 *
 * @param {{slug: string, qty: number}[]} cart
 * @param {string} slug
 * @returns {{slug: string, qty: number}[]}
 */
export function removeFromCart(cart, slug) {
  const lines = Array.isArray(cart) ? cart : [];
  return lines.filter((line) => line?.slug !== slug);
}

/**
 * Total units in the cart, for the header badge.
 *
 * @param {{slug: string, qty: number}[]|null|undefined} cart
 * @returns {number}
 */
export function cartCount(cart) {
  if (!Array.isArray(cart)) return 0;
  let total = 0;
  for (const line of cart) {
    const qty = normaliseQty(line?.qty);
    total += qty;
  }
  return total;
}