import { test, expect } from "bun:test";
import { validateCoupon, CouponError } from "./coupons.js";

const NOW = new Date("2026-10-02T12:00:00Z");

function makeCoupon(overrides = {}) {
  return {
    id: "clx123abc456",
    code: "FUNKY20",
    type: "PERCENT",
    value: 20,
    minOrderPaise: 0,
    maxDiscountPaise: null,
    usageLimit: null,
    perUserLimit: null,
    usedCount: 0,
    startsAt: new Date("2026-09-01T00:00:00Z"),
    expiresAt: new Date("2026-12-31T00:00:00Z"),
    isActive: true,
    ...overrides,
  };
}

function makeUserCoupon(overrides = {}) {
  return {
    id: "clx789def012",
    userId: "user-1",
    couponId: "clx123abc456",
    useCount: 0,
    ...overrides,
  };
}

// --- valid generic coupon ---

test("valid generic coupon returns the coupon", () => {
  const coupon = makeCoupon();
  const result = validateCoupon({
    code: "FUNKY20",
    userId: "user-1",
    subtotalPaise: 50000,
    coupon,
    userCoupon: null,
    now: NOW,
  });
  expect(result).toBe(coupon);
});

test("valid FLAT coupon returns the coupon", () => {
  const coupon = makeCoupon({ type: "FLAT", value: 5000, code: "FLAT50" });
  const result = validateCoupon({
    code: "FLAT50",
    userId: "user-1",
    subtotalPaise: 50000,
    coupon,
    userCoupon: null,
    now: NOW,
  });
  expect(result).toBe(coupon);
});

// --- NOT_FOUND ---

test("missing coupon throws NOT_FOUND", () => {
  expect(() =>
    validateCoupon({
      code: "NOPE",
      userId: "user-1",
      subtotalPaise: 50000,
      coupon: null,
      userCoupon: null,
      now: NOW,
    }),
  ).toThrow(CouponError);
  try {
    validateCoupon({
      code: "NOPE",
      userId: "user-1",
      subtotalPaise: 50000,
      coupon: null,
      userCoupon: null,
      now: NOW,
    });
  } catch (e) {
    expect(e.code).toBe("NOT_FOUND");
  }
});

// --- INACTIVE ---

test("inactive coupon throws INACTIVE", () => {
  const coupon = makeCoupon({ isActive: false });
  try {
    validateCoupon({
      code: "FUNKY20",
      userId: "user-1",
      subtotalPaise: 50000,
      coupon,
      userCoupon: null,
      now: NOW,
    });
    expect.unreachable();
  } catch (e) {
    expect(e).toBeInstanceOf(CouponError);
    expect(e.code).toBe("INACTIVE");
  }
});

// --- EXPIRED ---

test("expired coupon throws EXPIRED", () => {
  const coupon = makeCoupon({
    expiresAt: new Date("2026-09-01T00:00:00Z"),
  });
  try {
    validateCoupon({
      code: "FUNKY20",
      userId: "user-1",
      subtotalPaise: 50000,
      coupon,
      userCoupon: null,
      now: NOW,
    });
    expect.unreachable();
  } catch (e) {
    expect(e).toBeInstanceOf(CouponError);
    expect(e.code).toBe("EXPIRED");
  }
});

test("coupon expiring exactly now is expired", () => {
  const coupon = makeCoupon({ expiresAt: NOW });
  try {
    validateCoupon({
      code: "FUNKY20",
      userId: "user-1",
      subtotalPaise: 50000,
      coupon,
      userCoupon: null,
      now: NOW,
    });
    expect.unreachable();
  } catch (e) {
    expect(e.code).toBe("EXPIRED");
  }
});

test("coupon not yet started throws INACTIVE", () => {
  const coupon = makeCoupon({
    startsAt: new Date("2026-11-01T00:00:00Z"),
  });
  try {
    validateCoupon({
      code: "FUNKY20",
      userId: "user-1",
      subtotalPaise: 50000,
      coupon,
      userCoupon: null,
      now: NOW,
    });
    expect.unreachable();
  } catch (e) {
    expect(e.code).toBe("INACTIVE");
  }
});

// --- MIN_ORDER ---

test("below minOrderPaise throws MIN_ORDER", () => {
  const coupon = makeCoupon({ minOrderPaise: 50000 });
  try {
    validateCoupon({
      code: "FUNKY20",
      userId: "user-1",
      subtotalPaise: 49999,
      coupon,
      userCoupon: null,
      now: NOW,
    });
    expect.unreachable();
  } catch (e) {
    expect(e.code).toBe("MIN_ORDER");
  }
});

test("exactly at minOrderPaise is valid", () => {
  const coupon = makeCoupon({ minOrderPaise: 50000 });
  const result = validateCoupon({
    code: "FUNKY20",
    userId: "user-1",
    subtotalPaise: 50000,
    coupon,
    userCoupon: null,
    now: NOW,
  });
  expect(result).toBe(coupon);
});

// --- NOT_ASSIGNED (per-user coupon) ---

test("per-user coupon rejected for unassigned user", () => {
  const coupon = makeCoupon({ perUserLimit: 3 });
  try {
    validateCoupon({
      code: "FUNKY20",
      userId: "user-1",
      subtotalPaise: 50000,
      coupon,
      userCoupon: null,
      now: NOW,
    });
    expect.unreachable();
  } catch (e) {
    expect(e.code).toBe("NOT_ASSIGNED");
  }
});

test("per-user coupon valid for assigned user", () => {
  const coupon = makeCoupon({ perUserLimit: 3 });
  const userCoupon = makeUserCoupon({ useCount: 1 });
  const result = validateCoupon({
    code: "FUNKY20",
    userId: "user-1",
    subtotalPaise: 50000,
    coupon,
    userCoupon,
    now: NOW,
  });
  expect(result).toBe(coupon);
});

// --- LIMIT_REACHED ---

test("usage limit reached throws LIMIT_REACHED", () => {
  const coupon = makeCoupon({ usageLimit: 100, usedCount: 100 });
  try {
    validateCoupon({
      code: "FUNKY20",
      userId: "user-1",
      subtotalPaise: 50000,
      coupon,
      userCoupon: null,
      now: NOW,
    });
    expect.unreachable();
  } catch (e) {
    expect(e.code).toBe("LIMIT_REACHED");
  }
});

test("per-user limit reached throws LIMIT_REACHED", () => {
  const coupon = makeCoupon({ perUserLimit: 3 });
  const userCoupon = makeUserCoupon({ useCount: 3 });
  try {
    validateCoupon({
      code: "FUNKY20",
      userId: "user-1",
      subtotalPaise: 50000,
      coupon,
      userCoupon,
      now: NOW,
    });
    expect.unreachable();
  } catch (e) {
    expect(e.code).toBe("LIMIT_REACHED");
  }
});

test("per-user useCount below limit is valid", () => {
  const coupon = makeCoupon({ perUserLimit: 3 });
  const userCoupon = makeUserCoupon({ useCount: 2 });
  const result = validateCoupon({
    code: "FUNKY20",
    userId: "user-1",
    subtotalPaise: 50000,
    coupon,
    userCoupon,
    now: NOW,
  });
  expect(result).toBe(coupon);
});

// --- edge cases ---

test("coupon with no expiry is valid", () => {
  const coupon = makeCoupon({ expiresAt: null });
  const result = validateCoupon({
    code: "FUNKY20",
    userId: "user-1",
    subtotalPaise: 50000,
    coupon,
    userCoupon: null,
    now: NOW,
  });
  expect(result).toBe(coupon);
});

test("generic coupon with usageLimit not yet reached is valid", () => {
  const coupon = makeCoupon({ usageLimit: 100, usedCount: 50 });
  const result = validateCoupon({
    code: "FUNKY20",
    userId: "user-1",
    subtotalPaise: 50000,
    coupon,
    userCoupon: null,
    now: NOW,
  });
  expect(result).toBe(coupon);
});

test("userCoupon for a different user is treated as unassigned", () => {
  const coupon = makeCoupon({ perUserLimit: 3 });
  const userCoupon = makeUserCoupon({ userId: "user-2", useCount: 0 });
  try {
    validateCoupon({
      code: "FUNKY20",
      userId: "user-1",
      subtotalPaise: 50000,
      coupon,
      userCoupon,
      now: NOW,
    });
    expect.unreachable();
  } catch (e) {
    expect(e.code).toBe("NOT_ASSIGNED");
  }
});
