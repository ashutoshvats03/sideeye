import { describe, it, expect } from "bun:test";
import { validateContactInput } from "./contact-input.js";

const VALID = {
  name: "Anaya Sharma",
  email: "anaya@example.com",
  orderNumber: "SE-12345678",
  message: "My order shows delivered but one earring is missing from the box.",
};

describe("contact input", () => {
  it("accepts a complete valid message", () => {
    const r = validateContactInput(VALID);
    expect(r.ok).toBe(true);
  });

  it("accepts a message without an order number", () => {
    const { orderNumber, ...rest } = VALID;
    const r = validateContactInput(rest);
    expect(r.ok).toBe(true);
  });

  it("rejects a bad email, short message, and bad order number", () => {
    expect(validateContactInput({ ...VALID, email: "not-an-email" }).ok).toBe(false);
    expect(validateContactInput({ ...VALID, message: "hi" }).ok).toBe(false);
    expect(
      validateContactInput({ ...VALID, orderNumber: "123" }).ok,
    ).toBe(false);
  });

  it("rejects a missing name", () => {
    expect(validateContactInput({ ...VALID, name: "  " }).ok).toBe(false);
  });
});
