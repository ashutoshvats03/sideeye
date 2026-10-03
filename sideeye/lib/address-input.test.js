import { describe, expect, it } from "bun:test";
import { validateAddressInput } from "./address-input.js";

const VALID = {
  label: "Home",
  name: "Anaya Sharma",
  phone: "9812345678",
  line1: "14 Linking Road",
  line2: "Bandra West",
  city: "Mumbai",
  state: "Maharashtra",
  pincode: "400050",
};

describe("validateAddressInput", () => {
  it("accepts a full valid address and trims fields", () => {
    const res = validateAddressInput({ ...VALID, city: "  Mumbai " });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.city).toBe("Mumbai");
  });

  it("accepts a missing label and line2 (both optional)", () => {
    const { label, line2, ...rest } = VALID;
    const res = validateAddressInput(rest);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.label).toBeUndefined();
      expect(res.data.line2).toBe("");
    }
  });

  it("rejects a bad pincode, bad phone, and blank line1/city/state", () => {
    expect(validateAddressInput({ ...VALID, pincode: "40005" }).ok).toBe(false);
    expect(validateAddressInput({ ...VALID, pincode: "40005a" }).ok).toBe(false);
    expect(validateAddressInput({ ...VALID, phone: "1234567890" }).ok).toBe(false);
    expect(validateAddressInput({ ...VALID, line1: "  " }).ok).toBe(false);
    expect(validateAddressInput({ ...VALID, city: "" }).ok).toBe(false);
    expect(validateAddressInput({ ...VALID, state: "" }).ok).toBe(false);
  });

  it("rejects an over-long label", () => {
    expect(validateAddressInput({ ...VALID, label: "x".repeat(31) }).ok).toBe(false);
  });
});
