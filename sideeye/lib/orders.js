/**
 * Order reads used by the product page.
 *
 * Server-only (imports Prisma). Kept apart from `lib/products.js` because these queries
 * join the order tables rather than the catalogue — Plan 04 owns order creation and the
 * status state machine, and this file must not grow into a second implementation of it.
 */

import { prisma } from "./prisma.js";

/**
 * Has this user bought this product?
 *
 * Gates review submission (spec §5: "buyers can submit"). Deliberately narrow:
 *
 *  - An order only counts once it is actually DELIVERED. A cancelled or refunded order
 *    proves the shopper wanted the piece, not that they received it, and "did this arrive
 *    and how is it holding up" is the only question a product review can answer. Pending
 *    and shipped orders are excluded for the same reason.
 *  - The `status` string is compared against a named constant rather than a bare literal,
 *    so the rule reads as an intent at the call site.
 *
 * @param {string} userId
 * @param {string} productId
 * @returns {Promise<boolean>}
 */
export async function hasPurchasedProduct(userId, productId) {
  if (!userId || !productId) return false;

  const match = await prisma.orderItem.findFirst({
    where: {
      productId,
      order: { userId, status: DELIVERED_STATUS },
    },
    select: { id: true },
  });

  return match !== null;
}

/**
 * The one order status that counts as proof of purchase.
 *
 * The full state machine (`pending -> confirmed -> packed -> shipped -> delivered`, plus
 * `cancelled`/`refunded`) is defined in Plan 04, which also owns the transition guard.
 * Declaring just the terminal-success value here keeps this read honest without
 * pre-empting that work.
 */
export const DELIVERED_STATUS = "delivered";
