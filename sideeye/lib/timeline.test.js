import { describe, expect, it } from "bun:test";
import { normaliseTimeline } from "./timeline.js";

describe("normaliseTimeline", () => {
  it("sorts entries oldest-first by `at`", () => {
    const out = normaliseTimeline([
      { status: "confirmed", at: "2026-10-02T10:00:00.000Z", note: "" },
      { status: "pending", at: "2026-10-01T10:00:00.000Z", note: "" },
    ]);
    expect(out.map((e) => e.status)).toEqual(["pending", "confirmed"]);
  });

  it("falls back to [] for null, strings, and non-entry objects", () => {
    expect(normaliseTimeline(null)).toEqual([]);
    expect(normaliseTimeline("pending")).toEqual([]);
    expect(normaliseTimeline({})).toEqual([]);
    expect(normaliseTimeline([null, 42, { note: "no status" }])).toEqual([]);
  });

  it("keeps entries with a missing/unparseable `at` at the end", () => {
    const out = normaliseTimeline([
      { status: "shipped" },
      { status: "pending", at: "2026-10-01T10:00:00.000Z" },
      { status: "packed", at: "garbage" },
    ]);
    expect(out[0].status).toBe("pending");
    expect(out.map((e) => e.status)).toContain("shipped");
    expect(out.map((e) => e.status)).toContain("packed");
  });
});
