/**
 * Order lines eligible for stock restoration on cancel/refund.
 *
 * Deleting a product sets its order items' `productId` to NULL
 * (`onDelete: SetNull`, so history survives). Restoring stock for such a
 * line would feed `id: null` into the update and fail the whole
 * cancellation — so restore loops skip them. There is no product row left
 * to hold units anyway.
 *
 * @param {unknown} items order items (or anything unexpected)
 * @returns {Array} only items with a live productId
 */
export function restorableItems(items) {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => item != null && item.productId != null);
}
