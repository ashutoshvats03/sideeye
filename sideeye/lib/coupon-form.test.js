import { describe, it, expect } from "bun:test";
import { couponFormToPayload, couponToForm } from "./coupon-form.js";

const base = {
  type: "FLAT",
  value: "50",
  minOrder: "999.00",
  maxDiscount: "",
  usageLimit: "",
  perUserLimit: "1",
  isActive: true,
};

describe("coupon form payload", () => {
  it("converts a FLAT rupees value to integer paise", () => {
    const r = couponFormToPayload(base);
    expect(r.error).toBeUndefined();
    expect(r.data.value).toBe(5000);
  });

  it("converts a FLAT decimal rupees value to integer paise", () => {
    const r = couponFormToPayload({ ...base, value: "49.50" });
    expect(r.error).toBeUndefined();
    expect(r.data.value).toBe(4950);
  });

  it("leaves a PERCENT value untouched", () => {
    const r = couponFormToPayload({ ...base, type: "PERCENT", value: "20" });
    expect(r.error).toBeUndefined();
    expect(r.data.value).toBe(20);
  });

  it("rejects a non-numeric FLAT value with a form error", () => {
    const r = couponFormToPayload({ ...base, value: "fifty" });
    expect(r.data).toBeUndefined();
    expect(typeof r.error).toBe("string");
  });

  it("rejects a malformed minimum order with a form error", () => {
    const r = couponFormToPayload({ ...base, minOrder: "9.999" });
    expect(r.data).toBeUndefined();
    expect(typeof r.error).toBe("string");
  });

  it("round-trips a FLAT coupon back to a rupees form value", () => {
    const f = couponToForm({ code: "FLAT50", type: "FLAT", value: 5000, minOrderPaise: 99900, maxDiscountPaise: null, usageLimit: null, perUserLimit: 1, isActive: true });
    expect(f.value).toBe("50.00");
    expect(f.minOrder).toBe("999.00");
  });

  it("round-trips a PERCENT coupon back to a plain percent form value", () => {
    const f = couponToForm({ code: "DIWALI20", type: "PERCENT", value: 20, minOrderPaise: 0, maxDiscountPaise: null, usageLimit: null, perUserLimit: 1, isActive: true });
    expect(f.value).toBe("20");
  });
});
