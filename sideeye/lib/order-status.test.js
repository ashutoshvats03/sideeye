import { describe, it, expect } from "bun:test";
import {
  ORDER_STATUSES,
  TRANSITIONS,
  canTransition,
  legalTargets,
  isOrderStatus,
} from "./order-status.js";

const LEGAL = [
  ["pending", "confirmed"],
  ["pending", "cancelled"],
  ["confirmed", "packed"],
  ["confirmed", "cancelled"],
  ["packed", "shipped"],
  ["shipped", "delivered"],
  ["delivered", "refunded"],
];

const ILLEGAL = [
  ["pending", "delivered"],
  ["pending", "packed"],
  ["confirmed", "delivered"],
  ["confirmed", "refunded"],
  ["packed", "cancelled"],
  ["packed", "delivered"],
  ["shipped", "cancelled"],
  ["shipped", "refunded"],
  ["delivered", "pending"],
  ["delivered", "cancelled"],
  ["cancelled", "pending"],
  ["cancelled", "confirmed"],
  ["refunded", "pending"],
  ["refunded", "delivered"],
  ["pending", "pending"],
  ["bogus", "confirmed"],
  ["pending", "bogus"],
];

describe("order status machine", () => {
  it("lists all seven legal statuses", () => {
    expect([...ORDER_STATUSES].sort()).toEqual(
      ["pending", "confirmed", "packed", "shipped", "delivered", "cancelled", "refunded"].sort(),
    );
  });

  it("allows every legal transition", () => {
    for (const [from, to] of LEGAL) {
      expect(canTransition(from, to), `${from} → ${to}`).toBe(true);
    }
  });

  it("rejects every illegal transition", () => {
    for (const [from, to] of ILLEGAL) {
      expect(canTransition(from, to), `${from} → ${to}`).toBe(false);
    }
  });

  it("names the legal targets for a status", () => {
    expect(legalTargets("pending").sort()).toEqual(["cancelled", "confirmed"]);
    expect(legalTargets("delivered")).toEqual(["refunded"]);
    expect(legalTargets("cancelled")).toEqual([]);
    expect(legalTargets("bogus")).toEqual([]);
  });

  it("validates status strings", () => {
    expect(isOrderStatus("shipped")).toBe(true);
    expect(isOrderStatus("SHIPPED")).toBe(false);
    expect(isOrderStatus(null)).toBe(false);
  });

  it("covers every status in the transition map", () => {
    expect(Object.keys(TRANSITIONS).sort()).toEqual([...ORDER_STATUSES].sort());
  });
});
