// Review Focus edge cases from plan 01 (docs/plans/2026-10-02-01-foundation.md).
// These pin the boundaries the three sample tests in pricing.test.js do not cover.

import { test, expect } from "bun:test";
import { computeTotals, computeShippingPaise } from "./pricing.js";
import { formatPaise } from "./money.js";

const NOW = new Date("2026-10-02T12:00:00Z");

// --- free-shipping threshold is boundary-exact (review focus) ---

test("99899 paise pays shipping, 99900 does not", () => {
  // 99899 = Rs.998.99, one paise below the Rs.999 threshold.
  const below = computeTotals([{ pricePaise: 99899, qty: 1 }], null, NOW);
  expect(below.shippingPaise).toBe(4900);
  expect(below.totalPaise).toBe(99899 + 4900);

  const at = computeTotals([{ pricePaise: 99900, qty: 1 }], null, NOW);
  expect(at.shippingPaise).toBe(0);
  expect(at.totalPaise).toBe(99900);
});

test("shipping helper treats the threshold as inclusive", () => {
  expect(computeShippingPaise(99899)).toBe(4900);
  expect(computeShippingPaise(99900)).toBe(0);
  expect(computeShippingPaise(0)).toBe(0);
});

// --- discounts can never drive the total below zero (review focus) ---

test("percent coupon over 100% is clamped to the subtotal", () => {
  const r = computeTotals([{ pricePaise: 10000, qty: 1 }], {
    type: "PERCENT",
    value: 250,
    minOrderPaise: 0,
    maxDiscountPaise: null,
  }, NOW);
  expect(r.discountPaise).toBe(10000);
  expect(r.totalPaise).toBe(0);
});

test("flat coupon larger than the cart is clamped to the subtotal", () => {
  const r = computeTotals([{ pricePaise: 2500, qty: 2 }], {
    type: "FLAT",
    value: 999999,
    minOrderPaise: 0,
    maxDiscountPaise: null,
  }, NOW);
  expect(r.subtotalPaise).toBe(5000);
  expect(r.discountPaise).toBe(5000);
  expect(r.totalPaise).toBe(0);
});

// --- expired / inactive coupons are rejected even if the code matches (review focus) ---

test("expired coupon yields no discount", () => {
  const r = computeTotals([{ pricePaise: 50000, qty: 1 }], {
    type: "PERCENT",
    value: 20,
    minOrderPaise: 0,
    maxDiscountPaise: null,
    isActive: true,
    expiresAt: new Date("2026-10-01T00:00:00Z"), // already past
  }, NOW);
  expect(r.discountPaise).toBe(0);
  expect(r.totalPaise).toBe(50000 + 4900);
});

test("coupon expiring exactly now is already spent", () => {
  const r = computeTotals([{ pricePaise: 50000, qty: 1 }], {
    type: "PERCENT",
    value: 20,
    minOrderPaise: 0,
    maxDiscountPaise: null,
    expiresAt: NOW,
  }, NOW);
  expect(r.discountPaise).toBe(0);
});

test("inactive coupon yields no discount", () => {
  const r = computeTotals([{ pricePaise: 50000, qty: 1 }], {
    type: "PERCENT",
    value: 20,
    minOrderPaise: 0,
    maxDiscountPaise: null,
    isActive: false,
  }, NOW);
  expect(r.discountPaise).toBe(0);
});

test("coupon not yet started yields no discount", () => {
  const r = computeTotals([{ pricePaise: 50000, qty: 1 }], {
    type: "PERCENT",
    value: 20,
    minOrderPaise: 0,
    maxDiscountPaise: null,
    startsAt: new Date("2026-11-01T00:00:00Z"),
  }, NOW);
  expect(r.discountPaise).toBe(0);
});

// --- minOrder and maxDiscount cap ---

test("coupon is ignored below its minOrderPaise", () => {
  const r = computeTotals([{ pricePaise: 49999, qty: 1 }], {
    type: "PERCENT",
    value: 10,
    minOrderPaise: 50000,
    maxDiscountPaise: null,
  }, NOW);
  expect(r.discountPaise).toBe(0);
});

test("coupon applies exactly at its minOrderPaise", () => {
  const r = computeTotals([{ pricePaise: 50000, qty: 1 }], {
    type: "PERCENT",
    value: 10,
    minOrderPaise: 50000,
    maxDiscountPaise: null,
  }, NOW);
  expect(r.discountPaise).toBe(5000);
});

test("maxDiscountPaise caps a percent discount", () => {
  const r = computeTotals([{ pricePaise: 100000, qty: 1 }], {
    type: "PERCENT",
    value: 50, // would be Rs.500
    minOrderPaise: 0,
    maxDiscountPaise: 20000, // capped at Rs.200
  }, NOW);
  expect(r.discountPaise).toBe(20000);
});

// --- integer math: no float drift anywhere in the chain ---

test("percent discount floors to whole paise", () => {
  // 333 * 33 / 100 = 109.89 -> must floor to 109, never 109.88999999999999
  const r = computeTotals([{ pricePaise: 333, qty: 1 }], {
    type: "PERCENT",
    value: 33,
    minOrderPaise: 0,
    maxDiscountPaise: null,
  }, NOW);
  expect(r.discountPaise).toBe(109);
  expect(Number.isInteger(r.discountPaise)).toBe(true);
});

test("every total field is an integer for a messy cart", () => {
  const r = computeTotals(
    [
      { pricePaise: 19999, qty: 3 },
      { pricePaise: 4501, qty: 7 },
      { pricePaise: 1, qty: 1 },
    ],
    { type: "PERCENT", value: 17, minOrderPaise: 0, maxDiscountPaise: 7777 },
    NOW,
  );
  for (const [key, value] of Object.entries(r)) {
    expect(Number.isInteger(value)).toBe(true);
    expect(value).toBeGreaterThanOrEqual(0);
  }
  expect(r.subtotalPaise).toBe(19999 * 3 + 4501 * 7 + 1);
});

test("qty zero produces a zero-value cart with no shipping", () => {
  const r = computeTotals([{ pricePaise: 50000, qty: 0 }], null, NOW);
  expect(r).toEqual({
    subtotalPaise: 0,
    discountPaise: 0,
    shippingPaise: 0,
    totalPaise: 0,
  });
});

test("empty cart totals to zero", () => {
  expect(computeTotals([], null, NOW)).toEqual({
    subtotalPaise: 0,
    discountPaise: 0,
    shippingPaise: 0,
    totalPaise: 0,
  });
});

test("float pricePaise is rejected rather than silently rounded", () => {
  expect(() => computeTotals([{ pricePaise: 199.99, qty: 1 }], null, NOW)).toThrow(TypeError);
  expect(() => computeTotals([{ pricePaise: 19999, qty: 1.5 }], null, NOW)).toThrow(TypeError);
});

test("formatPaise rejects non-integer input", () => {
  expect(() => formatPaise(199.99)).toThrow(TypeError);
});
