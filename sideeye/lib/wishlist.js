/**
 * Wishlist rules (pure) plus guarded localStorage access.
 *
 * Only product slugs are ever persisted — never prices, names, or stock — so a
 * hand-edited value cannot change what anything costs; the wishlist page
 * re-resolves slugs against the database through `/api/wishlist`. Mirrors the
 * cart's split (`lib/cart.js` rules + `lib/cart-storage.js` DOM) in one small
 * module: the pure list functions stay unit-testable without a DOM.
 */

/** localStorage key. Namespaced so it cannot collide with the cart key. */
export const WISHLIST_KEY = "sideeye.wishlist.v1";

/** Fired on `window` after every mutation, so hearts stay in sync. */
export const WISHLIST_CHANGED_EVENT = "sideeye:wishlist-changed";

/** Hard cap: a hand-edited value cannot balloon the list. */
export const MAX_WISHLIST_ITEMS = 200;

function isSlug(s) {
  return typeof s === "string" && s.length > 0 && s.length <= 100;
}

/**
 * Parse anything (e.g. stored JSON) into a clean slug list. Garbage → [].
 *
 * @param {unknown} raw
 * @returns {string[]}
 */
export function parseWishlist(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  for (const item of raw) {
    if (!isSlug(item) || seen.has(item)) continue;
    seen.add(item);
    if (seen.size >= MAX_WISHLIST_ITEMS) break;
  }
  return [...seen];
}

/**
 * Toggle one slug. Pure — callers persist via `writeWishlist`.
 *
 * @param {string[]} list
 * @param {string} slug
 * @returns {{list: string[], added: boolean}}
 */
export function toggleWishlist(list, slug) {
  const current = parseWishlist(list);
  if (!isSlug(slug)) return { list: current, added: false };
  if (current.includes(slug)) {
    return { list: current.filter((s) => s !== slug), added: false };
  }
  return { list: parseWishlist([...current, slug]), added: true };
}

/**
 * @param {string[]} list
 * @param {string} slug
 * @returns {boolean}
 */
export function isWishlisted(list, slug) {
  return Array.isArray(list) && list.includes(slug);
}

function storage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Read the wishlist, tolerating anything stored in there. Never null. */
export function readWishlist() {
  const store = storage();
  if (!store) return [];
  try {
    return parseWishlist(JSON.parse(store.getItem(WISHLIST_KEY)));
  } catch {
    return [];
  }
}

/** Overwrite the stored wishlist with a normalised list. */
export function writeWishlist(list) {
  const normalised = parseWishlist(list);
  const store = storage();
  if (store) {
    try {
      store.setItem(WISHLIST_KEY, JSON.stringify(normalised));
    } catch {
      // Quota exceeded or storage disabled: hearts work in memory for this page.
    }
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(WISHLIST_CHANGED_EVENT));
  }
  return normalised;
}

/** Toggle one slug in storage. Returns the same shape as `toggleWishlist`. */
export function toggleStored(slug) {
  const result = toggleWishlist(readWishlist(), slug);
  writeWishlist(result.list);
  return result;
}
