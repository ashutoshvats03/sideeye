import { describe, it, expect } from "bun:test";
import { productInputSchema, PRODUCT_SLUG_RE } from "./product-input.js";

const valid = {
  name: "Crimson Hoops",
  slug: "crimson-hoops",
  description: "Funky anti-tarnish hoops.",
  pricePaise: 19999,
  stockQty: 10,
  categoryId: "cat_123",
  vibes: ["Baddie", "Slay"],
  images: ["/uploads/k3j9ab-hoops.png"],
  isActive: true,
};

describe("product input schema", () => {
  it("accepts a valid product", () => {
    expect(productInputSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects non-integer paise and negative stock", () => {
    expect(
      productInputSchema.safeParse({ ...valid, pricePaise: 199.99 }).success,
    ).toBe(false);
    expect(
      productInputSchema.safeParse({ ...valid, stockQty: -1 }).success,
    ).toBe(false);
  });

  it("rejects bad slugs and unknown vibes", () => {
    expect(PRODUCT_SLUG_RE.test("Bad Slug!")).toBe(false);
    expect(
      productInputSchema.safeParse({ ...valid, slug: "Bad Slug!" }).success,
    ).toBe(false);
    expect(
      productInputSchema.safeParse({ ...valid, vibes: ["Hacker"] }).success,
    ).toBe(false);
  });

  it("rejects mrp below price and path-traversal images", () => {
    expect(
      productInputSchema.safeParse({
        ...valid,
        pricePaise: 20000,
        mrpPaise: 15000,
      }).success,
    ).toBe(false);
    expect(
      productInputSchema.safeParse({ ...valid, images: ["/uploads/../../x.png"] })
        .success,
    ).toBe(false);
  });
});
