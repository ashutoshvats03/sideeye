import { describe, it, expect } from "bun:test";
import { ADMIN_SECTIONS, adminNeighbors } from "./admin-sections.js";

describe("admin sections", () => {
  it("lists the six sections in order", () => {
    expect(ADMIN_SECTIONS.map((s) => s.href)).toEqual([
      "/admin",
      "/admin/products",
      "/admin/orders",
      "/admin/coupons",
      "/admin/reviews",
      "/admin/users",
    ]);
  });

  it("names the previous and next neighbors", () => {
    expect(adminNeighbors("/admin/orders")).toEqual({
      prev: { label: "Products", href: "/admin/products" },
      next: { label: "Coupons", href: "/admin/coupons" },
    });
  });

  it("has no previous on the first section and no next on the last", () => {
    expect(adminNeighbors("/admin").prev).toBeNull();
    expect(adminNeighbors("/admin/users").next).toBeNull();
  });

  it("returns null neighbors for an unknown path", () => {
    expect(adminNeighbors("/admin/nope")).toEqual({ prev: null, next: null });
  });
});
