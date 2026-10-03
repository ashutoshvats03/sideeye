import { describe, expect, it } from "bun:test";
import { validateProfileInput } from "./profile-input.js";

describe("validateProfileInput", () => {
  it("accepts a full valid profile", () => {
    const res = validateProfileInput({
      name: "  Anaya Sharma ",
      dob: "2004-05-17",
      phone: "9812345678",
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.name).toBe("Anaya Sharma");
      expect(res.data.dob).toBe("2004-05-17");
      expect(res.data.phone).toBe("9812345678");
    }
  });

  it("treats blank dob/phone as absent (both optional)", () => {
    const res = validateProfileInput({ name: "Anaya", dob: "", phone: "  " });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.dob).toBeUndefined();
      expect(res.data.phone).toBeUndefined();
    }
  });

  it("rejects an empty name and a name over 80 chars", () => {
    expect(validateProfileInput({ name: "   " }).ok).toBe(false);
    expect(validateProfileInput({ name: "x".repeat(81) }).ok).toBe(false);
  });

  it("rejects a DOB in the future and a non-date", () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const future = validateProfileInput({ name: "Anaya", dob: tomorrow });
    expect(future.ok).toBe(false);
    expect(validateProfileInput({ name: "Anaya", dob: "not-a-date" }).ok).toBe(false);
    expect(validateProfileInput({ name: "Anaya", dob: "17-05-2004" }).ok).toBe(false);
  });

  it("rejects a phone that is not 10 digits", () => {
    expect(validateProfileInput({ name: "Anaya", phone: "981234567" }).ok).toBe(false);
    expect(validateProfileInput({ name: "Anaya", phone: "98123456789" }).ok).toBe(false);
    expect(validateProfileInput({ name: "Anaya", phone: "98123abc78" }).ok).toBe(false);
  });
});
