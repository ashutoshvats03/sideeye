import { describe, it, expect } from "bun:test";
import { restorableItems } from "./order-restore.js";

describe("restorable order lines", () => {
  it("keeps lines that still point at a live product", () => {
    const items = [
      { id: "a", productId: "p1", qty: 1 },
      { id: "b", productId: "p2", qty: 2 },
    ];
    expect(restorableItems(items)).toEqual(items);
  });

  it("drops lines whose product was deleted (productId set null)", () => {
    const items = [
      { id: "a", productId: "p1", qty: 1 },
      { id: "b", productId: null, qty: 2 },
    ];
    expect(restorableItems(items)).toEqual([{ id: "a", productId: "p1", qty: 1 }]);
  });

  it("tolerates a missing or non-array items list", () => {
    expect(restorableItems(null)).toEqual([]);
    expect(restorableItems(undefined)).toEqual([]);
  });
});
