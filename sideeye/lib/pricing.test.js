import { test, expect } from "bun:test";
import { computeTotals } from "./pricing.js";
import { formatPaise } from "./money.js";

test("20% coupon with cap + paid shipping", () => {
  const r = computeTotals([{ pricePaise: 50000, qty: 1 }], {
    type: "PERCENT",
    value: 20,
    minOrderPaise: 0,
    maxDiscountPaise: 5000,
  });
  expect(r).toEqual({
    subtotalPaise: 50000,
    discountPaise: 5000,
    shippingPaise: 4900,
    totalPaise: 49900,
  });
});

test("free shipping at threshold", () => {
  const r = computeTotals([{ pricePaise: 99900, qty: 1 }], null);
  expect(r.shippingPaise).toBe(0);
});

test("total never negative", () => {
  const r = computeTotals([{ pricePaise: 1000, qty: 1 }], {
    type: "FLAT",
    value: 5000,
    minOrderPaise: 0,
    maxDiscountPaise: null,
  });
  expect(r.totalPaise).toBe(0);
});

// --- formatPaise: no float drift in display ---

test("formatPaise renders paise without float drift", () => {
  expect(formatPaise(19999)).toBe("₹199.99");
  expect(formatPaise(1000)).toBe("₹10.00");
  expect(formatPaise(100)).toBe("₹1.00");
  expect(formatPaise(1)).toBe("₹0.01");
  expect(formatPaise(0)).toBe("₹0.00");
  expect(formatPaise(99900)).toBe("₹999.00");
  expect(formatPaise(4900)).toBe("₹49.00");
  // large value that would drift under naive float division
  expect(formatPaise(123456789)).toBe("₹1234567.89");
});
