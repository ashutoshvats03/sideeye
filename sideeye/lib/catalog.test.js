// Product catalogue query logic for Plan 03.
//
// This is the shared interface the home page (T1), shop (T2) and product detail (T3)
// all query through, so the Review Focus rules are pinned here rather than in three
// different page components:
//
//   - inactive products never appear anywhere
//   - an unknown vibe or sort cannot be smuggled into the query
//   - the related rail never shows the current product or an out-of-stock item

import { test, expect } from "bun:test";
import {
  PRODUCT_VIBES,
  SORTS,
  DEFAULT_SORT,
  buildProductWhere,
  buildProductOrderBy,
  isVisibleProduct,
  selectRelatedProducts,
} from "./catalog.js";

test("the five locked vibe labels are exported in spec order", () => {
  expect(PRODUCT_VIBES).toEqual([
    "Eye Special",
    "Funky",
    "Queen",
    "Slay",
    "Baddie",
  ]);
});

test("an empty filter still hides inactive products", () => {
  expect(buildProductWhere()).toEqual({ isActive: true });
  expect(buildProductWhere({})).toEqual({ isActive: true });
});

test("categorySlug filters through the category relation", () => {
  expect(buildProductWhere({ categorySlug: "ring" })).toEqual({
    isActive: true,
    category: { slug: "ring" },
  });
});

test("a known vibe filters with has on the array column", () => {
  expect(buildProductWhere({ vibe: "Baddie" })).toEqual({
    isActive: true,
    vibes: { has: "Baddie" },
  });
});

test("an unknown vibe is ignored rather than passed to the database", () => {
  // A visitor can put anything in the query string; it must not reach Prisma as a
  // filter value, and it must not silently turn into a no-op that looks filtered.
  expect(buildProductWhere({ vibe: "NotAVibe" })).toEqual({ isActive: true });
  expect(buildProductWhere({ vibe: "" })).toEqual({ isActive: true });
  expect(buildProductWhere({ vibe: "__proto__" })).toEqual({ isActive: true });
});

test("search matches name or description, case-insensitively", () => {
  const where = buildProductWhere({ q: "heart" });
  expect(where.OR).toEqual([
    { name: { contains: "heart", mode: "insensitive" } },
    { description: { contains: "heart", mode: "insensitive" } },
  ]);
  expect(where.isActive).toBe(true);
});

test("whitespace-only search is dropped instead of matching everything", () => {
  expect(buildProductWhere({ q: "   " })).toEqual({ isActive: true });
  expect(buildProductWhere({ q: "\n\t" })).toEqual({ isActive: true });
});

test("search is trimmed before it reaches the query", () => {
  const where = buildProductWhere({ q: "  halo  " });
  expect(where.OR[0].name.contains).toBe("halo");
});

test("category, vibe and search compose without dropping isActive", () => {
  const where = buildProductWhere({
    categorySlug: "arm-bracelet",
    vibe: "Queen",
    q: "cuff",
  });
  expect(where.isActive).toBe(true);
  expect(where.category).toEqual({ slug: "arm-bracelet" });
  expect(where.vibes).toEqual({ has: "Queen" });
  expect(where.OR).toHaveLength(2);
});

test("a non-string q is ignored", () => {
  expect(buildProductWhere({ q: 42 })).toEqual({ isActive: true });
  expect(buildProductWhere({ q: ["heart"] })).toEqual({ isActive: true });
});

test("each sort maps to an integer-safe ordering", () => {
  expect(buildProductOrderBy("newest")).toEqual([{ createdAt: "desc" }]);
  expect(buildProductOrderBy("price-asc")).toEqual([{ pricePaise: "asc" }]);
  expect(buildProductOrderBy("price-desc")).toEqual([{ pricePaise: "desc" }]);
});

test("rating sort breaks ties on review count so order is stable", () => {
  expect(buildProductOrderBy("rating")).toEqual([
    { ratingAvg: "desc" },
    { ratingCount: "desc" },
  ]);
});

test("an unknown or missing sort falls back to the default", () => {
  expect(DEFAULT_SORT).toBe("newest");
  expect(buildProductOrderBy(undefined)).toEqual([{ createdAt: "desc" }]);
  expect(buildProductOrderBy("")).toEqual([{ createdAt: "desc" }]);
  expect(buildProductOrderBy("; DROP TABLE")).toEqual([{ createdAt: "desc" }]);
  expect(buildProductOrderBy("price_asc")).toEqual([{ createdAt: "desc" }]);
});

test("every advertised sort key produces a real ordering", () => {
  for (const key of Object.keys(SORTS)) {
    expect(buildProductOrderBy(key).length).toBeGreaterThan(0);
  }
});

test("only an active product is visible", () => {
  expect(isVisibleProduct({ isActive: true })).toBe(true);
  expect(isVisibleProduct({ isActive: false })).toBe(false);
  expect(isVisibleProduct({})).toBe(false);
  expect(isVisibleProduct(null)).toBe(false);
});

test("the related rail drops the current product and out-of-stock items", () => {
  const candidates = [
    { slug: "current-one", isActive: true, stockQty: 5 },
    { slug: "current-one-dup", isActive: true, stockQty: 0 }, // out of stock
    { slug: "friend-a", isActive: true, stockQty: 3 },
    { slug: "friend-b", isActive: true, stockQty: 0 }, // out of stock
    { slug: "friend-c", isActive: true, stockQty: 7 },
    { slug: "friend-d", isActive: false, stockQty: 2 }, // inactive
  ];

  const related = selectRelatedProducts(candidates, {
    excludeSlug: "current-one",
    limit: 3,
  });

  expect(related.map((p) => p.slug)).toEqual(["friend-a", "friend-c"]);
});

test("the related rail caps at its limit", () => {
  const many = Array.from({ length: 10 }, (_, i) => ({
    slug: `p-${i}`,
    isActive: true,
    stockQty: 1,
  }));
  expect(selectRelatedProducts(many, { limit: 4 })).toHaveLength(4);
  expect(selectRelatedProducts(many, {})).toHaveLength(10);
  expect(selectRelatedProducts(many, { limit: 0 })).toHaveLength(0);
});

test("the related rail tolerates an empty or missing candidate list", () => {
  expect(selectRelatedProducts([], { limit: 4 })).toEqual([]);
  expect(selectRelatedProducts(null, { limit: 4 })).toEqual([]);
  expect(selectRelatedProducts(undefined, {})).toEqual([]);
});

test("the related rail preserves the order it was given", () => {
  const candidates = [
    { slug: "z-first", isActive: true, stockQty: 1 },
    { slug: "a-second", isActive: true, stockQty: 1 },
  ];
  expect(
    selectRelatedProducts(candidates, { excludeSlug: "nope" }).map((p) => p.slug),
  ).toEqual(["z-first", "a-second"]);
});