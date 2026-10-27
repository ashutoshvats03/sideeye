import { describe, it, expect } from "bun:test";
import { toggleVibeValue } from "./catalog.js";

describe("toggleVibeValue", () => {
  it("adds a vibe that is not selected", () => {
    expect(toggleVibeValue([], "Slay")).toEqual(["Slay"]);
    expect(toggleVibeValue(["Queen"], "Slay").sort()).toEqual(["Queen", "Slay"]);
  });

  it("removes a vibe that is already selected", () => {
    expect(toggleVibeValue(["Slay", "Queen"], "Slay")).toEqual(["Queen"]);
  });

  it("tolerates a non-array current value", () => {
    expect(toggleVibeValue(undefined, "Slay")).toEqual(["Slay"]);
  });
});
