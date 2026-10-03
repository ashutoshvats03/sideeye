import { describe, it, expect } from "bun:test";
import { validateCouponInput, normaliseCouponCode } from "./coupon-input.js";

const validPercent = {
  code: "DIWALI20",
  type: "PERCENT",
  value: 20,
  minOrderPaise: 99900,
  maxDiscountPaise: 50000,
  usageLimit: 100,
  perUserLimit: 1,
  isActive: true,
};

describe("coupon input schema", () => {
  it("accepts a valid percent coupon", () => {
    const r = validateCouponInput(validPercent);
    expect(r.ok).toBe(true);
  });

  it("accepts a valid flat coupon (paise)", () => {
    const r = validateCouponInput({
      code: "FLAT50",
      type: "FLAT",
      value: 5000,
      minOrderPaise: 0,
      isActive: true,
    });
    expect(r.ok).toBe(true);
  });

  it("normalises codes to uppercase", () => {
    expect(normaliseCouponCode(" diwali20 ")).toBe("DIWALI20");
  });

  it("rejects percent outside 1–100", () => {
    expect(validateCouponInput({ ...validPercent, value: 0 }).ok).toBe(false);
    expect(validateCouponInput({ ...validPercent, value: 101 }).ok).toBe(false);
  });

  it("rejects non-integer or non-positive flat values", () => {
    expect(validateCouponInput({ ...validPercent, type: "FLAT", value: 99.5 }).ok).toBe(
      false,
    );
    expect(validateCouponInput({ ...validPercent, type: "FLAT", value: 0 }).ok).toBe(
      false,
    );
  });

  it("rejects an insane max discount above the cap", () => {
    expect(
      validateCouponInput({ ...validPercent, maxDiscountPaise: 100000000 }).ok,
    ).toBe(false);
  });

  it("rejects bad codes", () => {
    expect(validateCouponInput({ ...validPercent, code: "a!" }).ok).toBe(false);
    expect(validateCouponInput({ ...validPercent, code: "x".repeat(25) }).ok).toBe(
      false,
    );
  });
});
