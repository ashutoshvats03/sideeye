import { test, expect } from "bun:test";
import {
  addToCart,
  removeFromCart,
  setQty,
  parseCart,
  serializeCart,
  cartCount,
  MAX_QTY_PER_LINE,
} from "./cart.js";

test("a new cart is an empty array", () => {
  expect(parseCart(null)).toEqual([]);
});

test("adding to an empty cart creates one line", () => {
  expect(addToCart([], "ruby-ember-ring", 1)).toEqual([
    { slug: "ruby-ember-ring", qty: 1 },
  ]);
});

test("adding an existing slug increases its qty instead of duplicating", () => {
  let cart = addToCart([], "ruby-ember-ring", 1);
  cart = addToCart(cart, "ruby-ember-ring", 2);
  expect(cart).toEqual([{ slug: "ruby-ember-ring", qty: 3 }]);
});

test("cart order is insertion order, not sorted", () => {
  let cart = addToCart([], "zeta", 1);
  cart = addToCart(cart, "alpha", 1);
  expect(cart.map((l) => l.slug)).toEqual(["zeta", "alpha"]);
});

test("qty below 1 is normalised to 1", () => {
  expect(addToCart([], "ring", 0)).toEqual([{ slug: "ring", qty: 1 }]);
  expect(addToCart([], "ring", -5)).toEqual([{ slug: "ring", qty: 1 }]);
});

test("qty is capped at MAX_QTY_PER_LINE", () => {
  const huge = MAX_QTY_PER_LINE + 50;
  expect(addToCart([], "ring", huge)[0].qty).toBe(MAX_QTY_PER_LINE);
});

test("adding beyond stock is clamped to the available qty", () => {
  // maxQty models stockQty. A shopper cannot add more than exists.
  expect(addToCart([], "ring", 9, { maxQty: 4 })).toEqual([
    { slug: "ring", qty: 4 },
  ]);
});

test("adding to a line that already meets maxQty leaves it unchanged", () => {
  let cart = addToCart([], "ring", 4, { maxQty: 4 });
  cart = addToCart(cart, "ring", 4, { maxQty: 4 });
  expect(cart).toEqual([{ slug: "ring", qty: 4 }]);
});

test("setQty changes a single line and leaves the rest alone", () => {
  const cart = [
    { slug: "a", qty: 1 },
    { slug: "b", qty: 2 },
  ];
  expect(setQty(cart, "b", 5)).toEqual([
    { slug: "a", qty: 1 },
    { slug: "b", qty: 5 },
  ]);
});

test("setQty on an unknown slug is a no-op", () => {
  const cart = [{ slug: "a", qty: 1 }];
  expect(setQty(cart, "zzz", 4)).toEqual(cart);
});

test("setQty still clamps to maxQty", () => {
  expect(setQty([{ slug: "a", qty: 1 }], "a", 99, { maxQty: 3 })).toEqual([
    { slug: "a", qty: 3 },
  ]);
});

test("removeFromCart drops only the named slug", () => {
  const cart = [
    { slug: "a", qty: 1 },
    { slug: "b", qty: 2 },
  ];
  expect(removeFromCart(cart, "a")).toEqual([{ slug: "b", qty: 2 }]);
});

test("removeFromCart on an unknown slug is a no-op", () => {
  const cart = [{ slug: "a", qty: 1 }];
  expect(removeFromCart(cart, "zzz")).toEqual(cart);
});

// --- parseCart: localStorage is untrusted input, so it must never be trusted ---

test("parseCart round-trips a serialised cart", () => {
  const cart = [{ slug: "a", qty: 2 }];
  expect(parseCart(serializeCart(cart))).toEqual(cart);
});

test("parseCart rejects non-JSON and returns an empty cart", () => {
  expect(parseCart("{not json")).toEqual([]);
  expect(parseCart("undefined")).toEqual([]);
  expect(parseCart("")).toEqual([]);
});

test("parseCart rejects a non-array payload", () => {
  expect(parseCart('{"slug":"a"}')).toEqual([]);
  expect(parseCart("null")).toEqual([]);
  expect(parseCart("42")).toEqual([]);
});

test("parseCart drops lines that are not objects", () => {
  expect(parseCart('["a", 5, null, {"slug":"b","qty":1}]')).toEqual([
    { slug: "b", qty: 1 },
  ]);
});

test("parseCart drops entries with a missing or non-string slug", () => {
  expect(parseCart('[{"qty":1},{"slug":5,"qty":1},{"slug":"ok","qty":1}]')).toEqual(
    [{ slug: "ok", qty: 1 }],
  );
});

test("parseCart clamps a hostile qty instead of trusting it", () => {
  expect(parseCart('[{"slug":"a","qty":-9}]')).toEqual([{ slug: "a", qty: 1 }]);
  expect(parseCart('[{"slug":"a","qty":0}]')).toEqual([{ slug: "a", qty: 1 }]);
  expect(parseCart('[{"slug":"a","qty":"5"}]')).toEqual([{ slug: "a", qty: 5 }]);
  expect(parseCart(`[{"slug":"a","qty":${MAX_QTY_PER_LINE + 500}}]`)).toEqual([
    { slug: "a", qty: MAX_QTY_PER_LINE },
  ]);
});

test("parseCart collapses duplicate slugs into one summed line", () => {
  expect(
    parseCart('[{"slug":"a","qty":1},{"slug":"a","qty":2}]'),
  ).toEqual([{ slug: "a", qty: 3 }]);
});

test("parseCart discards slugs that are not url-safe", () => {
  // Guards against a crafted localStorage value injecting a path or script payload.
  expect(parseCart('[{"slug":"../admin","qty":1}]')).toEqual([]);
  expect(parseCart('[{"slug":"a b","qty":1}]')).toEqual([]);
  expect(parseCart('[{"slug":"","qty":1}]')).toEqual([]);
});

test("cartCount sums quantities across lines", () => {
  expect(
    cartCount([
      { slug: "a", qty: 2 },
      { slug: "b", qty: 3 },
    ]),
  ).toBe(5);
  expect(cartCount([])).toBe(0);
  expect(cartCount(null)).toBe(0);
});

test("the serialised form carries only slug and qty", () => {
  const parsed = parseCart('[{"slug":"a","qty":2,"evil":"x"}]');
  expect(Object.keys(parsed[0]).sort()).toEqual(["qty", "slug"]);
});

test("a non-finite qty from storage is dropped to 1, never NaN", () => {
  // JSON cannot express Infinity, but a giant exponent can still parse to Infinity.
  expect(parseCart('[{"slug":"a","qty":1e400}]')).toEqual([{ slug: "a", qty: 1 }]);
});

test("addToCart with zero stock creates no line on an empty cart", () => {
  // maxQty 0 models stockQty 0. There is nothing to hold, so nothing is added.
  expect(addToCart([], "ring", 1, { maxQty: 0 })).toEqual([]);
});

test("addToCart with zero stock leaves an existing cart untouched", () => {
  const cart = [{ slug: "ring", qty: 2 }];
  expect(addToCart(cart, "ring", 3, { maxQty: 0 })).toEqual(cart);
  expect(addToCart(cart, "other", 1, { maxQty: 0 })).toEqual(cart);
});

test("setQty with zero stock removes the line", () => {
  const cart = [
    { slug: "a", qty: 2 },
    { slug: "b", qty: 1 },
  ];
  expect(setQty(cart, "a", 5, { maxQty: 0 })).toEqual([{ slug: "b", qty: 1 }]);
});

test("setQty with zero stock on an unknown slug is a no-op", () => {
  const cart = [{ slug: "a", qty: 1 }];
  expect(setQty(cart, "zzz", 4, { maxQty: 0 })).toEqual(cart);
});