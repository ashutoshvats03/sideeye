import { describe, it, expect } from "bun:test";
import { pendingReviewItems } from "./review-nudge.js";

const item = (id, productId, slug, active) => ({
  id,
  productId,
  product: slug ? { slug, isActive: active } : null,
});

describe("delivered review nudge", () => {
  it("lists live-product items the user has not reviewed", () => {
    const items = [item("a", "p1", "ring", true), item("b", "p2", "hoops", true)];
    expect(pendingReviewItems(items, ["p1"]).map((i) => i.id)).toEqual(["b"]);
  });

  it("returns empty when everything is reviewed", () => {
    const items = [item("a", "p1", "ring", true)];
    expect(pendingReviewItems(items, ["p1"])).toEqual([]);
  });

  it("skips items whose product was deleted or deactivated", () => {
    const items = [
      item("a", null, null, false),
      item("b", "p2", "hoops", false),
      item("c", "p3", "ring", true),
    ];
    expect(pendingReviewItems(items, []).map((i) => i.id)).toEqual(["c"]);
  });

  it("tolerates missing inputs", () => {
    expect(pendingReviewItems(null, [])).toEqual([]);
    expect(pendingReviewItems([], null)).toEqual([]);
  });
});
