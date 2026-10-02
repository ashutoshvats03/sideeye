import { test, expect } from "bun:test";
import { parseShopParams, buildShopHref, hasActiveFilters } from "./shop-filters.js";
import { MAX_QUERY_LENGTH, PRODUCT_VIBES } from "./catalog.js";

// --- parseShopParams: absent params produce a clean default state ---

test("absent params give the default state", () => {
  expect(parseShopParams({})).toEqual({
    category: undefined,
    vibe: undefined,
    q: undefined,
    sort: "newest",
  });
});

test("undefined and null params are treated as absent", () => {
  const s = parseShopParams({ category: undefined, vibe: null, q: undefined });
  expect(s.category).toBeUndefined();
  expect(s.vibe).toBeUndefined();
  expect(s.q).toBeUndefined();
});

// --- category ---

test("a category slug is kept, lowercased and trimmed", () => {
  expect(parseShopParams({ category: "arm-bracelet" }).category).toBe("arm-bracelet");
  expect(parseShopParams({ category: "  Arm-Bracelet  " }).category).toBe("arm-bracelet");
});

test("a blank category is dropped", () => {
  expect(parseShopParams({ category: "   " }).category).toBeUndefined();
});

test("a category containing a slash or quote is dropped, not forwarded to the DB", () => {
  // These come straight from the URL. A slug is [a-z0-9-]; anything else is junk.
  expect(parseShopParams({ category: "../../etc/passwd" }).category).toBeUndefined();
  expect(parseShopParams({ category: "a'b" }).category).toBeUndefined();
  expect(parseShopParams({ category: "a b" }).category).toBeUndefined();
});

// --- vibe ---

test("every locked vibe survives parsing", () => {
  for (const vibe of PRODUCT_VIBES) {
    expect(parseShopParams({ vibe }).vibe).toBe(vibe);
  }
});

test("a vibe is matched case-insensitively to the canonical label", () => {
  // "eye special" must become "Eye Special" so the chip highlights and the DB filter agree.
  expect(parseShopParams({ vibe: "eye special" }).vibe).toBe("Eye Special");
  expect(parseShopParams({ vibe: "BADDIE" }).vibe).toBe("Baddie");
});

test("an unknown vibe is dropped so it silently widens to all vibes", () => {
  expect(parseShopParams({ vibe: "Sparkly" }).vibe).toBeUndefined();
  expect(parseShopParams({ vibe: "" }).vibe).toBeUndefined();
});

test("a vibe not in the locked set is never returned verbatim", () => {
  for (const junk of ["Sparkly", "<script>", "a".repeat(50)]) {
    expect(PRODUCT_VIBES).not.toContain(junk);
    expect(parseShopParams({ vibe: junk }).vibe).toBeUndefined();
  }
});

// --- search term ---

test("a search term is trimmed", () => {
  expect(parseShopParams({ q: "  ruby ring  " }).q).toBe("ruby ring");
});

test("a whitespace-only search term is dropped", () => {
  expect(parseShopParams({ q: "   " }).q).toBeUndefined();
});

test("an over-long search term is capped at the shared query limit", () => {
  const s = parseShopParams({ q: "x".repeat(500) });
  expect(s.q).toHaveLength(MAX_QUERY_LENGTH);
});

test("a search term keeps real punctuation a shopper would type", () => {
  expect(parseShopParams({ q: "gold ring <3" }).q).toBe("gold ring <3");
});

// --- sort ---

test("every known sort key round-trips", () => {
  for (const key of ["newest", "price-asc", "price-desc", "rating"]) {
    expect(parseShopParams({ sort: key }).sort).toBe(key);
  }
});

test("an unknown sort falls back to the default instead of erroring", () => {
  expect(parseShopParams({ sort: "cheapest-ever" }).sort).toBe("newest");
  expect(parseShopParams({ sort: "DROP TABLE" }).sort).toBe("newest");
});

test("sort is always defined, even when the param is missing", () => {
  expect(parseShopParams({}).sort).toBe("newest");
  expect(parseShopParams({ sort: undefined }).sort).toBe("newest");
});

// --- repeated params: Next gives us an array ---

test("a repeated param uses the first value and never an array", () => {
  const s = parseShopParams({ category: ["necklace", "ring"], vibe: ["Funky", "Queen"] });
  expect(s.category).toBe("necklace");
  expect(s.vibe).toBe("Funky");
  expect(Array.isArray(s.vibe)).toBe(false);
});

// --- buildShopHref: shareable, stable, minimal ---

test("an empty state links to a bare /shop", () => {
  expect(buildShopHref({})).toBe("/shop");
  expect(buildShopHref({ sort: "newest" })).toBe("/shop");
});

test("all active filters appear in one href", () => {
  const href = buildShopHref({
    category: "arm-bracelet",
    vibe: "Baddie",
    q: "cuff",
    sort: "price-asc",
  });
  expect(href).toBe("/shop?category=arm-bracelet&vibe=Baddie&q=cuff&sort=price-asc");
});

test("param order is stable regardless of object key order", () => {
  const a = buildShopHref({ sort: "rating", q: "ring", vibe: "Funky", category: "ring" });
  const b = buildShopHref({ category: "ring", vibe: "Funky", q: "ring", sort: "rating" });
  expect(a).toBe(b);
});

test("empty and undefined params are omitted from the href", () => {
  expect(buildShopHref({ category: "", vibe: undefined, q: "  ", sort: "newest" })).toBe("/shop");
});

// URLSearchParams emits application/x-www-form-urlencoded, so a space becomes "+".
// Both "+" and "%20" are legal in a query string; the round-trip assertions below are the
// guarantee that matters (that Next decodes it back to the original value).
test("a search term with spaces is encoded", () => {
  expect(buildShopHref({ q: "gold ring" })).toBe("/shop?q=gold+ring");
  expect(new URL(buildShopHref({ q: "gold ring" }), "http://x").searchParams.get("q")).toBe(
    "gold ring",
  );
});

test("a vibe with a space is encoded and stays recoverable", () => {
  const href = buildShopHref({ vibe: "Eye Special" });
  expect(href).toBe("/shop?vibe=Eye+Special");
  expect(new URL(href, "http://x").searchParams.get("vibe")).toBe("Eye Special");
});

test("a vibe that is not a real vibe never reaches the href", () => {
  expect(buildShopHref({ vibe: "<script>alert(1)</script>" })).toBe("/shop");
});

test("a category that is not a slug never reaches the href", () => {
  expect(buildShopHref({ category: "../../etc/passwd" })).toBe("/shop");
});

test("every href round-trips through parseShopParams", () => {
  const state = { category: "arm-bracelet", vibe: "Eye Special", q: "gold ring", sort: "rating" };
  const url = new URL(buildShopHref(state), "http://x");
  const back = parseShopParams({
    category: url.searchParams.get("category"),
    vibe: url.searchParams.get("vibe"),
    q: url.searchParams.get("q"),
    sort: url.searchParams.get("sort"),
  });
  expect(back).toEqual(state);
});

test("an ampersand in a search term cannot forge an extra param", () => {
  const href = buildShopHref({ q: "ruby&sort=price-desc" });
  const url = new URL(href, "http://x");
  expect(url.searchParams.get("q")).toBe("ruby&sort=price-desc");
  expect(url.searchParams.get("sort")).toBeNull();
});

// --- hasActiveFilters drives the "Clear all" affordance ---

test("hasActiveFilters is false when nothing narrows the grid", () => {
  expect(hasActiveFilters(parseShopParams({}))).toBe(false);
  expect(hasActiveFilters(parseShopParams({ sort: "rating" }))).toBe(false);
});

test("hasActiveFilters is true for each narrowing filter", () => {
  expect(hasActiveFilters(parseShopParams({ category: "ring" }))).toBe(true);
  expect(hasActiveFilters(parseShopParams({ vibe: "Baddie" }))).toBe(true);
  expect(hasActiveFilters(parseShopParams({ q: "ruby" }))).toBe(true);
});

test("a junk filter does not make the page claim filters are active", () => {
  expect(hasActiveFilters(parseShopParams({ vibe: "Sparkly" }))).toBe(false);
  expect(hasActiveFilters(parseShopParams({ q: "   " }))).toBe(false);
});