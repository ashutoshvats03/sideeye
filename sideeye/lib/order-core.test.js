import { test, expect } from "bun:test";
import {
  normaliseCheckoutItems,
  buildOrderNumber,
  ORDER_NUMBER_PREFIX,
  ORDER_NUMBER_LENGTH,
} from "./order-core.js";

// --- normaliseClientItems: the trust boundary for the cart payload ---

test("accepts a well-formed cart and coerces qty to an integer", () => {
  const items = normaliseCheckoutItems([
    { slug: "ruby-ember-ring", qty: 2 },
    { slug: "blush-heart-necklace", qty: "3" },
  ]);
  expect(items).toEqual([
    { slug: "ruby-ember-ring", qty: 2 },
    { slug: "blush-heart-necklace", qty: 3 },
  ]);
});

test("drops lines whose slug is missing, not a string, or fails the safe-slug shape", () => {
  const items = normaliseCheckoutItems([
    { slug: "ruby-ember-ring", qty: 1 },
    { qty: 1 },
    { slug: 42, qty: 1 },
    { slug: "../admin", qty: 1 },
    { slug: "a b", qty: 1 },
    { slug: "", qty: 1 },
    { slug: "has space", qty: 1 },
    null,
    "not-an-object",
  ]);
  expect(items).toEqual([{ slug: "ruby-ember-ring", qty: 1 }]);
});

test("coerces a non-numeric, negative and zero qty up to 1, and floors a fraction", () => {
  const items = normaliseCheckoutItems([
    { slug: "a", qty: "abc" },
    { slug: "b", qty: -5 },
    { slug: "c", qty: 0 },
    { slug: "d", qty: 2.9 },
    { slug: "e", qty: null },
  ]);
  expect(items.map((i) => i.qty)).toEqual([1, 1, 1, 2, 1]);
});

test("clamps qty to the per-line maximum", () => {
  const items = normaliseCheckoutItems([{ slug: "a", qty: 999 }]);
  expect(items[0].qty).toBe(10);
});

test("an empty or non-array payload yields an empty list", () => {
  expect(normaliseCheckoutItems([])).toEqual([]);
  expect(normaliseCheckoutItems(null)).toEqual([]);
  expect(normaliseCheckoutItems("nope")).toEqual([]);
  expect(normaliseCheckoutItems({})).toEqual([]);
});

// --- buildOrderNumber ---

test("order numbers carry the prefix and are the expected length", () => {
  const n = buildOrderNumber();
  expect(n.startsWith(ORDER_NUMBER_PREFIX)).toBe(true);
  expect(n).toHaveLength(ORDER_NUMBER_PREFIX.length + ORDER_NUMBER_LENGTH);
});

test("order numbers are unique across many generations", () => {
  const seen = new Set();
  for (let i = 0; i < 500; i++) seen.add(buildOrderNumber());
  expect(seen.size).toBe(500);
});

test("order numbers use only unambiguous characters", () => {
  const n = buildOrderNumber();
  expect(n).toMatch(/^SE-[A-Z0-9]+$/);
});
