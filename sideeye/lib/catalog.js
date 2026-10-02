/**
 * Product catalogue query logic.
 *
 * Single source of truth for how the storefront lists products. The home page (bestsellers),
 * the shop grid and the "you may also like" rail all build their Prisma `where` here, so the
 * rule "inactive products are never listed" cannot drift between three components.
 *
 * Pure functions only — no Prisma import — so this file is unit testable and safe to use
 * from any component.
 */

/** The five locked vibe labels (spec §7). Anything outside this set is not a real filter. */
export const PRODUCT_VIBES = ["Eye Special", "Funky", "Queen", "Slay", "Baddie"];

/** Shop sort options. Keys are the `sort` URL param values. */
export const SORTS = {
  newest: "Newest",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  rating: "Top rated",
};

/** Applied when the `sort` param is absent or unrecognised. */
export const DEFAULT_SORT = "newest";

/** Longest search term we will send to the database. */
const MAX_QUERY_LENGTH = 100;

/**
 * Build the Prisma `where` clause for a product listing.
 *
 * `isActive: true` is unconditional and is applied FIRST, so no combination of query params
 * can widen the result set back to unpublished products. Unknown vibe and sort values are
 * dropped rather than forwarded: these come straight from the URL, and passing arbitrary
 * strings into a Prisma filter is how you get surprising results and injection surprises.
 *
 * @param {{categorySlug?: string|null, vibe?: string|null, q?: string|null}} [filters]
 * @returns {object} Prisma `where` object
 */
export function buildProductWhere(filters = {}) {
  const where = { isActive: true };

  const categorySlug = typeof filters.categorySlug === "string" ? filters.categorySlug : "";
  if (categorySlug) {
    where.category = { slug: categorySlug };
  }

  const vibe = typeof filters.vibe === "string" ? filters.vibe : "";
  if (vibe && PRODUCT_VIBES.includes(vibe)) {
    where.vibes = { has: vibe };
  }

  const q = typeof filters.q === "string" ? filters.q.trim() : "";
  if (q) {
    const term = q.slice(0, MAX_QUERY_LENGTH);
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { description: { contains: term, mode: "insensitive" } },
    ];
  }

  return where;
}

/**
 * Build the Prisma `orderBy` for a sort key.
 *
 * Unknown keys fall back to DEFAULT_SORT so a hand-edited URL still renders a sensible grid
 * rather than a database error.
 *
 * @param {string} [sort]
 * @returns {object[]} Prisma `orderBy` array
 */
export function buildProductOrderBy(sort) {
  switch (sort) {
    case "price-asc":
      return [{ pricePaise: "asc" }];
    case "price-desc":
      return [{ pricePaise: "desc" }];
    case "rating":
      return [{ ratingAvg: "desc" }, { ratingCount: "desc" }];
    case "newest":
    default:
      return [{ createdAt: "desc" }];
  }
}

/**
 * Is this product eligible to appear in a public listing?
 *
 * @param {{isActive?: boolean}|null|undefined} product
 * @returns {boolean}
 */
export function isVisibleProduct(product) {
  return product?.isActive === true;
}

/**
 * Choose the "you may also like" rail from an already-filtered candidate list.
 *
 * Keeps the given order (the caller's DB ordering is the merchandising decision) and
 * removes the product being viewed plus anything that cannot be bought. A zero-stock item
 * is worse than no suggestion — it is a dead end one tap away.
 *
 * @param {{slug: string, isActive: boolean, stockQty: number}[]} candidates
 * @param {{excludeSlug?: string, limit?: number}} [options]
 * @returns {object[]}
 */
export function selectRelatedProducts(candidates, options = {}) {
  if (!Array.isArray(candidates)) return [];

  const { excludeSlug, limit } = options;

  const available = candidates.filter(
    (p) =>
      p &&
      isVisibleProduct(p) &&
      p.stockQty > 0 &&
      (!excludeSlug || p.slug !== excludeSlug),
  );

  return typeof limit === "number" ? available.slice(0, limit) : available;
}