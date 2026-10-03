import { describe, it, expect } from "bun:test";
import { FALLBACK_PRODUCT_IMAGE, primaryImage } from "./images.js";

describe("primary product image", () => {
  it("returns the first image when present", () => {
    expect(primaryImage(["/uploads/a.jpg", "/uploads/b.jpg"])).toBe("/uploads/a.jpg");
  });

  it("falls back when the list is empty", () => {
    expect(primaryImage([])).toBe(FALLBACK_PRODUCT_IMAGE);
  });

  it("falls back when images is missing or not a list", () => {
    expect(primaryImage(null)).toBe(FALLBACK_PRODUCT_IMAGE);
    expect(primaryImage(undefined)).toBe(FALLBACK_PRODUCT_IMAGE);
  });

  it("skips blank entries", () => {
    expect(primaryImage(["", "/uploads/a.jpg"])).toBe("/uploads/a.jpg");
    expect(primaryImage(["", "  "])).toBe(FALLBACK_PRODUCT_IMAGE);
  });
});
