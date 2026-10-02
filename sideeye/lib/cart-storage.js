/**
 * Browser-localStorage persistence for the cart.
 *
 * All cart RULES live in `lib/cart.js` (pure, fully unit tested). This module only owns
 * the storage side, so the rules stay testable without a DOM.
 *
 * `[{ slug, qty }]` is the BINDING on-disk format consumed by Plan 04. Nothing else is
 * persisted — no price, no stock, no name — because those are re-read from the database
 * server-side at checkout. A hand-edited localStorage value therefore cannot change what
 * the shopper is charged.
 */

import { parseCart, serializeCart, addToCart, setQty } from "./cart.js";

/** localStorage key. Namespaced so it cannot collide with anything else on the origin. */
export const CART_STORAGE_KEY = "sideeye.cart.v1";

/** Fired on `window` after every mutation, so the header badge can react. */
export const CART_CHANGED_EVENT = "sideeye:cart-changed";

function storage() {
  // Private-mode Safari and hardened browsers throw on access rather than returning null.
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Read the cart from localStorage, tolerating anything that is in there.
 *
 * @returns {{slug: string, qty: number}[]} never null, always a valid cart
 */
export function readCart() {
  const store = storage();
  if (!store) return [];
  try {
    return parseCart(store.getItem(CART_STORAGE_KEY));
  } catch {
    return [];
  }
}

/**
 * Overwrite the stored cart. Purely internal — callers use the mutators below.
 *
 * Normalisation goes cart -> JSON text -> cart on purpose. `parseCart` validates raw JSON
 * TEXT, not an array; handing it an array yields `[]` and would wipe the cart on every
 * write. Round-tripping through `serializeCart` first also means storage can only ever
 * receive `slug` and `qty`, whatever the caller passed in.
 *
 * @param {{slug: string, qty: number}[]} cart
 * @returns {{slug: string, qty: number}[]} the normalised cart that was actually stored
 */
export function writeCart(cart) {
  const store = storage();
  const normalised = parseCart(serializeCart(cart));
  if (store) {
    try {
      store.setItem(CART_STORAGE_KEY, serializeCart(normalised));
    } catch {
      // Quota exceeded or storage disabled: the cart lives in memory for this page only.
    }
  }
  notifyCartChanged();
  return normalised;
}

function notifyCartChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CART_CHANGED_EVENT));
}

/**
 * Add `qty` of `slug`, merging into an existing line rather than duplicating it.
 *
 * @param {string} slug
 * @param {number} [qty]
 * @param {{maxQty?: number}} [options] maxQty models available stock
 * @returns {{slug: string, qty: number}[]} the new cart
 */
export function addItem(slug, qty = 1, options = {}) {
  return writeCart(addToCart(readCart(), slug, qty, options));
}

/**
 * Set an absolute quantity for `slug`.
 *
 * @param {string} slug
 * @param {number} qty
 * @param {{maxQty?: number}} [options]
 * @returns {{slug: string, qty: number}[]} the new cart
 */
export function updateItem(slug, qty, options = {}) {
  return writeCart(setQty(readCart(), slug, qty, options));
}

/**
 * Remove a line entirely.
 *
 * @param {string} slug
 * @returns {{slug: string, qty: number}[]} the new cart
 */
export function removeItem(slug) {
  const next = readCart().filter((line) => line.slug !== slug);
  return writeCart(next);
}

/** Empty the cart. */
export function clearCart() {
  return writeCart([]);
}