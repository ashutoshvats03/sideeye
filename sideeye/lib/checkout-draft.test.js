import { describe, it, expect } from "bun:test";
import {
  DRAFT_KEY,
  parseDraft,
  isAddressStepComplete,
} from "./checkout-draft.js";

const VALID_ADDRESS = {
  name: "Anaya Sharma",
  phone: "9812345678",
  line1: "14 Linking Road",
  line2: "",
  city: "Mumbai",
  state: "Maharashtra",
  pincode: "400050",
};

describe("checkout draft", () => {
  it("has a stable storage key", () => {
    expect(DRAFT_KEY).toBe("sideeye-checkout-draft");
  });

  it("parses a valid stored draft", () => {
    const d = parseDraft({ selectedId: "abc", address: VALID_ADDRESS, couponCode: "DIWALI20" });
    expect(d.selectedId).toBe("abc");
    expect(d.couponCode).toBe("DIWALI20");
  });

  it("rejects garbage and wrong-shaped drafts", () => {
    expect(parseDraft(null)).toBeNull();
    expect(parseDraft("nope")).toBeNull();
    expect(parseDraft({ selectedId: 42 })).toBeNull();
    expect(parseDraft({ address: VALID_ADDRESS })).toBeNull();
  });

  it("accepts a saved-address selection as a complete step 1", () => {
    expect(isAddressStepComplete("addr-1", {}).ok).toBe(true);
  });

  it("accepts a valid new address as a complete step 1", () => {
    const r = isAddressStepComplete("new", VALID_ADDRESS);
    expect(r.ok).toBe(true);
  });

  it("rejects an invalid new address with the field error", () => {
    const r = isAddressStepComplete("new", { ...VALID_ADDRESS, pincode: "123" });
    expect(r.ok).toBe(false);
    expect(typeof r.error).toBe("string");
  });

  it("rejects an empty selection", () => {
    const r = isAddressStepComplete("", VALID_ADDRESS);
    expect(r.ok).toBe(false);
  });
});
