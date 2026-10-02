/**
 * Build cart lines from the persisted `[{ slug, qty }]` shape.
 *
 * SERVER-ONLY (imports Prisma). This is the trust boundary for money: the client sends
 * only slugs and quantities, and every price is re-read from the database here. A stale or
 * hand-edited localStorage value can therefore never change what the shopper is charged
 * (AGENTS.md: never trust prices or totals from the client).
 *
 * Inactive or missing products are dropped silently — a cart line for a piece that no
 * longer exists should vanish, not error the page.
 */

import { prisma } from "./prisma.js";
import { computeSubtotalPaise } from "./pricing.js";
import { MAX_QTY_PER_LINE } from "./cart.js";

/** The fields the cart page and checkout need, and nothing more. */
const LINE_SELECT = {
  id: true,
  name: true,
  slug: true,
  pricePaise: true,
  mrpPaise: true,
  images: true,
  stockQty: true,
  isActive: true,
};

/**
 * Coerce a client-supplied qty into a safe integer.
 *
 * The API is a public endpoint, so `qty` can arrive as a string, a float, a negative, or
 * a non-number. Anything non-finite becomes 1 rather than propagating a NaN into the
 * summary. The result is clamped to [1, MAX_QTY_PER_LINE] and then to live stock.
 *
 * @param {unknown} raw
 * @param {number} stockQty
 * @returns {number}
 */
function normaliseClientQty(raw, stockQty) {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return 1;
  const whole = Math.floor(n);
  const floor = Math.max(1, whole);
  const ceiling = Math.min(MAX_QTY_PER_LINE, Math.max(0, stockQty));
  return Math.min(floor, ceiling);
}

/**
 * @param {Array<{slug: unknown, qty: unknown}>|null|undefined} items
 * @returns {Promise<{lines: Array<{product: object, qty: number}>, subtotalPaise: number}>}
 */
export async function buildCartLines(items) {
  if (!Array.isArray(items)) return { lines: [], subtotalPaise: 0 };

  const slugs = items
    .map((line) => line?.slug)
    .filter((slug) => typeof slug === "string" && slug.length > 0);

  if (slugs.length === 0) return { lines: [], subtotalPaise: 0 };

  const products = await prisma.product.findMany({
    where: { slug: { in: slugs }, isActive: true },
    select: LINE_SELECT,
  });
  const bySlug = new Map(products.map((product) => [product.slug, product]));

  const lines = [];
  for (const item of items) {
    const product = bySlug.get(item?.slug);
    if (!product) continue; // inactive or missing — drop the line
    const qty = normaliseClientQty(item?.qty, product.stockQty);
    if (qty < 1) continue; // no sellable stock
    lines.push({ product, qty });
  }

  const subtotalPaise = computeSubtotalPaise(
    lines.map((line) => ({ pricePaise: line.product.pricePaise, qty: line.qty })),
  );

  return { lines, subtotalPaise };
}
