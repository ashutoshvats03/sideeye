/**
 * Server-side catalogue reads.
 *
 * Shared by every storefront surface (home, shop, product detail) so they cannot
 * disagree about what is visible. Two rules are enforced here rather than in each page,
 * because getting either wrong leaks data that should not be public:
 *
 * 1. Only `isActive` products are ever returned (spec §5, plan Review Focus).
 * 2. Only `isApproved` reviews are ever counted or shown — INCLUDING the rating summary,
 *    so a pending review cannot inflate the stars shown to a shopper.
 *
 * The `Product.ratingAvg` / `ratingCount` columns are denormalised caches, not the
 * source of truth for display: reading them would let an unapproved review's count leak
 * into the summary. Every rating shown to a shopper is aggregated from approved rows.
 *
 * Server-only: imports Prisma. Never import this from a client component.
 */

import { prisma } from "./prisma.js";
import {
  buildProductOrderBy,
  buildProductWhere,
  selectRelatedProducts,
} from "./catalog.js";

/**
 * Fields a product card needs. Keeps list queries narrow and avoids shipping cart data.
 *
 * `isActive` is selected even though the WHERE clauses already filter on it, because
 * `selectRelatedProducts` re-checks `isVisibleProduct` in JS. Omitting it made that check
 * fail for every row and silently emptied the "you may also like" rail. `lib/products.test.js`
 * pins the contract that this select carries every field the selectors read.
 */
export const CARD_SELECT = {
  id: true,
  name: true,
  slug: true,
  pricePaise: true,
  mrpPaise: true,
  images: true,
  vibes: true,
  stockQty: true,
  isActive: true,
  category: { select: { name: true, slug: true } },
};

/**
 * Aggregated rating per product, counting ONLY approved reviews.
 *
 * @param {string[]} productIds
 * @returns {Promise<Map<string, {avg: number, count: number}>>} keyed by productId;
 *   products with no approved reviews are absent from the map (callers show "no reviews").
 */
export async function getApprovedRatingMap(productIds) {
  const map = new Map();
  if (!productIds?.length) return map;

  const grouped = await prisma.review.groupBy({
    by: ["productId"],
    where: { productId: { in: productIds }, isApproved: true },
    _avg: { rating: true },
    _count: { _all: true },
  });

  for (const row of grouped) {
    map.set(row.productId, {
      // Round to one decimal for display: 4.3333 -> 4.3.
      avg: Math.round((row._avg.rating ?? 0) * 10) / 10,
      count: row._count._all,
    });
  }
  return map;
}

/**
 * Rating summary for a single product, approved reviews only.
 *
 * @param {string} productId
 * @returns {Promise<{avg: number, count: number}>} `{avg: 0, count: 0}` when unrated.
 */
export async function getApprovedRatingSummary(productId) {
  const map = await getApprovedRatingMap([productId]);
  return map.get(productId) ?? { avg: 0, count: 0 };
}

/**
 * Best sellers for the home rail: most-reviewed active products, so "popular" is backed
 * by real approved review volume rather than a hand-picked flag.
 *
 * @param {number} [limit]
 * @returns {Promise<Array>} product card records
 */
export async function getBestsellers(limit = 6) {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: CARD_SELECT,
    orderBy: [{ ratingCount: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
  return products;
}

/**
 * Categories for the shop-by-category rail, in the seeded display order.
 *
 * @returns {Promise<Array<{id, name, slug, image, productCount}>>}
 */
export async function getCategories() {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      image: true,
      _count: { select: { products: { where: { isActive: true } } } },
    },
  });
  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    image: c.image,
    productCount: c._count.products,
  }));
}

/**
 * A single active product by slug.
 *
 * Returns null for an inactive or missing product so callers 404 identically for both —
 * an inactive product must not be distinguishable from a missing one by response code.
 *
 * @param {string} slug
 * @returns {Promise<object|null>}
 */
export async function getActiveProductBySlug(slug) {
  if (typeof slug !== "string" || slug.length === 0) return null;

  return prisma.product.findFirst({
    where: { slug, isActive: true },
    include: { category: { select: { name: true, slug: true } } },
  });
}

/**
 * Related rail for the product detail page: same category, in stock, never the product
 * itself. Selection rules live in `lib/catalog.js` so they are unit tested.
 *
 * @param {{id: string, slug: string, categoryId: string}} product
 * @param {number} [limit]
 * @returns {Promise<Array>} product card records
 */
export async function getRelatedProducts(product, limit = 4) {
  if (!product?.categoryId) return [];

  const candidates = await prisma.product.findMany({
    where: { categoryId: product.categoryId, isActive: true },
    select: CARD_SELECT,
    orderBy: [{ createdAt: "desc" }],
  });

  return selectRelatedProducts(candidates, {
    excludeSlug: product.slug,
    limit,
  });
}

/**
 * Approved reviews for a product, newest first.
 *
 * @param {string} productId
 * @param {number} [limit]
 * @returns {Promise<Array<{id, rating, text, createdAt, user: {name}}>>}
 */
export async function getApprovedReviews(productId, limit = 20) {
  return prisma.review.findMany({
    where: { productId, isApproved: true },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      rating: true,
      text: true,
      createdAt: true,
      // Only the display name is read: reviews must not expose reviewer emails or ids.
      user: { select: { name: true } },
    },
  });
}

/**
 * Most recent approved reviews across the whole store, for the home testimonial strip.
 *
 * @param {number} [limit]
 * @returns {Promise<Array>}
 */
export async function getRecentApprovedReviews(limit = 3) {
  return prisma.review.findMany({
    where: { isApproved: true },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      rating: true,
      text: true,
      createdAt: true,
      user: { select: { name: true } },
      product: { select: { name: true, slug: true } },
    },
  });
}

/**
 * Catalogue listing for the shop page.
 *
 * Filtering and sorting are delegated to `lib/catalog.js` so the shop page and any
 * later admin/search surface cannot drift apart on visibility rules.
 *
 * @param {{categorySlug?: string, vibe?: string, q?: string, sort?: string}} filters
 * @returns {Promise<{products: Array, ratingMap: Map}>}
 */
export async function listProducts(filters = {}) {
  const products = await prisma.product.findMany({
    where: buildProductWhere(filters),
    select: CARD_SELECT,
    orderBy: buildProductOrderBy(filters.sort),
  });

  return {
    products,
    ratingMap: await getApprovedRatingMap(products.map((p) => p.id)),
  };
}