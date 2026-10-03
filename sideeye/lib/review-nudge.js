/**
 * Delivered-order review nudge.
 *
 * On the order detail page, a delivered order shows an "Enjoying your
 * pieces?" section linking each not-yet-reviewed item to its product page.
 * An item qualifies only when its product still exists, is still active, and
 * the signed-in user has no review for it (one review per user per product).
 * Reviewed items drop out on their own, so no dismiss state is needed.
 */

/**
 * @param {unknown} items order items with `{ id, productId, product: { slug, isActive } | null }`
 * @param {unknown} reviewedProductIds product ids the user already reviewed
 * @returns {Array} items eligible for the nudge
 */
export function pendingReviewItems(items, reviewedProductIds) {
  if (!Array.isArray(items)) return [];
  const reviewed = new Set(Array.isArray(reviewedProductIds) ? reviewedProductIds : []);
  return items.filter(
    (item) =>
      item != null &&
      item.productId != null &&
      item.product != null &&
      item.product.isActive === true &&
      typeof item.product.slug === "string" &&
      !reviewed.has(item.productId),
  );
}
