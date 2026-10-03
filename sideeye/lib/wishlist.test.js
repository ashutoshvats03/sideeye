import { describe, it, expect } from "bun:test";
import {
  parseWishlist,
  toggleWishlist,
  isWishlisted,
} from "./wishlist.js";

describe("wishlist", () => {
  it("parses a valid stored list", () => {
    expect(parseWishlist(["ring-1", "hoops-2"])).toEqual(["ring-1", "hoops-2"]);
  });

  it("rejects garbage and non-slug entries", () => {
    expect(parseWishlist(null)).toEqual([]);
    expect(parseWishlist("nope")).toEqual([]);
    expect(parseWishlist({})).toEqual([]);
    expect(parseWishlist(["ok-1", "", 42, null, "ok-1"])).toEqual(["ok-1"]);
  });

  it("caps the list so a hand-edited value cannot balloon it", () => {
    const big = Array.from({ length: 500 }, (_, i) => `slug-${i}`);
    expect(parseWishlist(big).length).toBeLessThanOrEqual(200);
  });

  it("toggles a slug on and off", () => {
    const added = toggleWishlist([], "ring-1");
    expect(added).toEqual({ list: ["ring-1"], added: true });
    const removed = toggleWishlist(added.list, "ring-1");
    expect(removed).toEqual({ list: [], added: false });
  });

  it("checks membership", () => {
    expect(isWishlisted(["ring-1"], "ring-1")).toBe(true);
    expect(isWishlisted(["ring-1"], "other")).toBe(false);
    expect(isWishlisted([], "ring-1")).toBe(false);
  });
});
