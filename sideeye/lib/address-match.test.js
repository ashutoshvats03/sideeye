import { describe, it, expect } from "bun:test";
import { isSameAddress } from "./address-match.js";

const BASE = {
  name: "Anaya Sharma",
  phone: "9812345678",
  line1: "14 Linking Road",
  line2: "",
  city: "Mumbai",
  state: "Maharashtra",
  pincode: "400050",
};

describe("address dedupe match", () => {
  it("matches identical addresses", () => {
    expect(isSameAddress(BASE, { ...BASE })).toBe(true);
  });

  it("treats null and empty line2 as the same", () => {
    expect(isSameAddress(BASE, { ...BASE, line2: null })).toBe(true);
    expect(isSameAddress({ ...BASE, line2: null }, BASE)).toBe(true);
  });

  it("ignores surrounding whitespace", () => {
    expect(isSameAddress(BASE, { ...BASE, line1: "  14 Linking Road " })).toBe(true);
  });

  it("rejects a different phone or pincode", () => {
    expect(isSameAddress(BASE, { ...BASE, phone: "9812345679" })).toBe(false);
    expect(isSameAddress(BASE, { ...BASE, pincode: "400051" })).toBe(false);
  });

  it("rejects non-objects", () => {
    expect(isSameAddress(BASE, null)).toBe(false);
    expect(isSameAddress(null, BASE)).toBe(false);
  });
});
