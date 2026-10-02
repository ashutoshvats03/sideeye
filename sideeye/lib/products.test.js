import { test, expect, describe } from "bun:test";
import { prisma } from "./prisma.js";
import { CARD_SELECT, getRelatedProducts, getActiveProductBySlug } from "./products.js";
import { selectRelatedProducts } from "./catalog.js";

/**
 * These are CONTRACT tests between the database query shape and the pure selector.
 *
 * The bug this file exists for: `selectRelatedProducts` filters on `isActive`, but
 * `CARD_SELECT` did not request it, so every candidate was rejected and the "you may also
 * like" rail silently rendered nothing on every product page. The 19 pure unit tests in
 * catalog.test.js all passed the whole time, because their hand-built fixtures included
 * `isActive` — nobody checked that the real query supplies what the selector reads.
 *
 * So these assert the wiring: the select must carry every field the selector reads, and the
 * real query must return rows the selector keeps.
 */

describe("CARD_SELECT covers what the selectors read", () => {
  test("the select includes every field selectRelatedProducts reads", () => {
    // The fields selectRelatedProducts/isVisibleProduct inspect, by contract.
    for (const field of ["slug", "isActive", "stockQty"]) {
      expect(CARD_SELECT[field]).toBe(true);
    }
  });

  test("selectRelatedProducts keeps a row built from the real select shape", () => {
    const candidate = {
      id: "p1",
      name: "Ring",
      slug: "a-ring",
      pricePaise: 10000,
      mrpPaise: 20000,
      images: [],
      vibes: [],
      stockQty: 3,
      isActive: true,
      category: { name: "Ring", slug: "ring" },
    };
    expect(selectRelatedProducts([candidate], { excludeSlug: "other" })).toHaveLength(1);
  });
});

describe("getRelatedProducts against the real database", () => {
  test("returns in-stock products from the same category", async () => {
    const product = await getActiveProductBySlug("ruby-ember-ring");
    expect(product).not.toBeNull();

    const related = await getRelatedProducts(product, 4);

    expect(related.length).toBeGreaterThan(0);
    for (const item of related) {
      expect(item.category.slug).toBe(product.category.slug);
      expect(item.stockQty).toBeGreaterThan(0);
      expect(item.slug).not.toBe(product.slug);
      expect(item.isActive).toBe(true);
    }
  });

  test("respects the limit", async () => {
    const product = await getActiveProductBySlug("ruby-ember-ring");
    expect((await getRelatedProducts(product, 2)).length).toBeLessThanOrEqual(2);
  });

  test("returns [] for a product with no categoryId", async () => {
    expect(await getRelatedProducts({ slug: "x" }, 4)).toEqual([]);
  });
});
