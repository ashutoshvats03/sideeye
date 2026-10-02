/**
 * Shop page URL-parameter state.
 *
 * The shop grid is fully described by four URL params: `category`, `vibe`, `q`, `sort`.
 * Keeping that state in the URL (rather than in React state) is what makes a filtered view
 * shareable, bookmarkable and survivable on refresh or back-navigation.
 *
 * Everything here is untrusted input straight off the query string, so each param is
 * validated against an allow-list before it is used or reflected into an href. An
 * unrecognised filter is DROPPED, never forwarded: passing an arbitrary string into a
 * Prisma filter or into a link is how you get surprising results and injection surprises.
 *
 * Pure functions only — no Prisma import, safe in server and client components alike.
 */

import {
  DEFAULT_SORT,
  MAX_QUERY_LENGTH,
  PRODUCT_VIBES,
  SORTS,
} from "./catalog.js";

/**
 * A category slug is lowercase alphanumerics in dash-separated groups.
 *
 * Deliberately narrow. The seeded slugs (`necklace`, `arm-bracelet`) all match; anything
 * carrying a dot, slash, quote, space or control character does not, which is what stops
 * traversal-ish and quote-breaking values from reaching a Prisma filter or an href.
 */
const CATEGORY_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Canonical order of params in a built href. Stable so shared URLs are byte-identical. */
const PARAM_ORDER = ["category", "vibe", "q", "sort"];

/** First value of a possibly-repeated param. Next hands us `string | string[]`. */
function firstValue(value) {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw : "";
}

/** @returns {string|undefined} a valid category slug, else undefined */
function normaliseCategory(value) {
  const slug = firstValue(value).trim().toLowerCase();
  return CATEGORY_SLUG.test(slug) ? slug : undefined;
}

/** @returns {string|undefined} the canonical vibe label, else undefined */
function normaliseVibe(value) {
  const raw = firstValue(value).trim();
  if (!raw) return undefined;
  // Case-insensitive so a hand-typed /shop?vibe=eye+special still highlights the chip and
  // matches the same rows as the canonical "Eye Special".
  const match = PRODUCT_VIBES.find((v) => v.toLowerCase() === raw.toLowerCase());
  return match ?? undefined;
}

/** @returns {string|undefined} the trimmed, length-capped search term, else undefined */
function normaliseQuery(value) {
  const trimmed = firstValue(value).trim();
  return trimmed ? trimmed.slice(0, MAX_QUERY_LENGTH) : undefined;
}

/** @returns {string} a known sort key, else DEFAULT_SORT */
function normaliseSort(value) {
  const raw = firstValue(value).trim();
  return Object.prototype.hasOwnProperty.call(SORTS, raw) ? raw : DEFAULT_SORT;
}

/**
 * Normalise raw `searchParams` into the shop's filter state.
 *
 * `sort` is always a valid key (a junk value degrades to the default instead of throwing,
 * so a hand-edited URL still renders). The other three are `undefined` when absent or invalid.
 *
 * @param {Record<string, string|string[]|undefined>} [params]
 * @returns {{category: string|undefined, vibe: string|undefined,
 *            q: string|undefined, sort: string}}
 */
export function parseShopParams(params = {}) {
  return {
    category: normaliseCategory(params.category),
    vibe: normaliseVibe(params.vibe),
    q: normaliseQuery(params.q),
    sort: normaliseSort(params.sort),
  };
}

/**
 * Build the canonical `/shop?...` href for a filter state.
 *
 * Re-validates rather than trusting the caller, so this is safe to hand arbitrary values
 * from a client component. Params are omitted when empty, and the default sort is omitted
 * so the plain-grid URL stays clean.
 *
 * @param {{category?: string, vibe?: string, q?: string, sort?: string}} [state]
 * @returns {string} e.g. "/shop?category=ring&sort=rating"
 */
export function buildShopHref(state = {}) {
  const normalised = parseShopParams(state);
  const query = new URLSearchParams();

  for (const key of PARAM_ORDER) {
    const value = normalised[key];
    // An unknown sort has already collapsed to DEFAULT_SORT; drop it so the default view
    // is always the bare /shop rather than /shop?sort=newest.
    if (!value || (key === "sort" && value === DEFAULT_SORT)) continue;
    query.set(key, value);
  }

  const qs = query.toString();
  return qs ? `/shop?${qs}` : "/shop";
}

/**
 * Is anything actually narrowing the grid?
 *
 * Drives whether to show a "Clear all" control. Sorting does not count: re-ordering is not
 * a filter, and showing "clear filters" for a mere sort change would be misleading.
 *
 * @param {{category?: string, vibe?: string, q?: string}} state
 * @returns {boolean}
 */
export function hasActiveFilters(state = {}) {
  return Boolean(state.category || state.vibe || state.q);
}