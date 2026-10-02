import { test, expect } from "bun:test";
import { parseReviewInput, REVIEW_TEXT_MAX, PRODUCT_ID_MAX } from "./review-input.js";

const valid = {
  productId: "clx123abc456",
  rating: 4,
  text: "Gorgeous and it has not tarnished yet.",
};

test("a valid review parses", () => {
  expect(parseReviewInput(valid)).toEqual({ ok: true, value: valid });
});

test("rating must be a whole number from 1 to 5", () => {
  for (const bad of [0, 6, -1, 2.5, "4", null, undefined, {}]) {
    expect(parseReviewInput({ ...valid, rating: bad }).ok).toBe(false);
  }
  for (const good of [1, 2, 3, 4, 5]) {
    expect(parseReviewInput({ ...valid, rating: good }).ok).toBe(true);
  }
});

test("text is trimmed", () => {
  const r = parseReviewInput({ ...valid, text: "  lovely  " });
  expect(r.ok).toBe(true);
  expect(r.value.text).toBe("lovely");
});

test("empty or whitespace-only text is allowed", () => {
  // A star rating with no words is a legitimate review.
  const r = parseReviewInput({ ...valid, text: "   " });
  expect(r.ok).toBe(true);
  expect(r.value.text).toBe("");
});

test("missing text entirely is allowed", () => {
  expect(parseReviewInput({ ...valid, text: undefined }).ok).toBe(true);
});

test("text longer than the limit is rejected", () => {
  const r = parseReviewInput({ ...valid, text: "x".repeat(REVIEW_TEXT_MAX + 1) });
  expect(r.ok).toBe(false);
  expect(r.error).toContain("2000");
});

test("text at exactly the limit is accepted", () => {
  expect(parseReviewInput({ ...valid, text: "x".repeat(REVIEW_TEXT_MAX) }).ok).toBe(
    true,
  );
});

test("a non-string text is rejected rather than coerced", () => {
  // Coercing 42 to "42" would let a client send a value the UI never produces.
  expect(parseReviewInput({ ...valid, text: 42 }).ok).toBe(false);
  expect(parseReviewInput({ ...valid, text: { toString: () => "x" } }).ok).toBe(
    false,
  );
});

test("unknown fields are dropped, not passed through", () => {
  // Stops a client smuggling isApproved:true or userId into the payload.
  const r = parseReviewInput({
    ...valid,
    isApproved: true,
    userId: "someone-elses-id",
    id: "fake",
  });
  expect(r.ok).toBe(true);
  expect(Object.keys(r.value).sort()).toEqual(["productId", "rating", "text"]);
});

test("a completely wrong payload type is rejected", () => {
  expect(parseReviewInput(null).ok).toBe(false);
  expect(parseReviewInput("a string").ok).toBe(false);
  expect(parseReviewInput([]).ok).toBe(false);
});

test("the failure result names the field for the API response", () => {
  const r = parseReviewInput({ ...valid, rating: 9 });
  expect(r.ok).toBe(false);
  expect(typeof r.error).toBe("string");
  expect(r.error.length).toBeGreaterThan(0);
});

test("control characters are stripped from text", () => {
  // A review is rendered back to other shoppers; null bytes and bidi overrides in
  // stored text can corrupt or spoof the display. Built from char codes rather than
  // written literally, so this test file stays plain text.
  const NULL = String.fromCharCode(0);
  const RLO = String.fromCharCode(0x202e);
  const ESC = String.fromCharCode(27);
  const dirty = `good${NULL} ${RLO}item${ESC}`;

  const r = parseReviewInput({ ...valid, text: dirty });
  expect(r.ok).toBe(true);
  expect(r.value.text).not.toContain(NULL);
  expect(r.value.text).not.toContain(RLO);
  expect(r.value.text).not.toContain(ESC);
  expect(r.value.text).toBe("good item");
});

test("tabs and newlines survive, so multi-line comments work", () => {
  const r = parseReviewInput({ ...valid, text: "line one\nline two" });
  expect(r.ok).toBe(true);
  expect(r.value.text).toBe("line one\nline two");
});

// --- productId ---
//
// The route needs a productId to attach the review to. Before this was validated, the
// route read `parsed.value.productId`, which was simply `undefined` because the schema
// never declared the field -- a review could never have been attached to anything.

test("productId is required", () => {
  const r = parseReviewInput({ rating: 5, text: "no id supplied" });
  expect(r.ok).toBe(false);
  expect(r.error).toContain("product");
});

test("productId must be a string and is not coerced", () => {
  for (const bad of [42, true, null, {}, [], ["clx123abc456"]]) {
    expect(parseReviewInput({ ...valid, productId: bad }).ok).toBe(false);
  }
});

test("productId rejects path separators, dots and spaces", () => {
  // Defence in depth: a productId is an opaque database key, so anything that looks like
  // a path or an expression has no legitimate form and is refused before the query.
  for (const bad of [
    "../admin",
    "..%2Fadmin",
    "a/b",
    "a\\b",
    "a b",
    "a.b",
    "a'b",
    'a"b',
    "a;b",
    "a$1",
  ]) {
    const r = parseReviewInput({ ...valid, productId: bad });
    expect(r.ok).toBe(false);
  }
});

test("productId rejects an empty or whitespace-only value", () => {
  expect(parseReviewInput({ ...valid, productId: "" }).ok).toBe(false);
  expect(parseReviewInput({ ...valid, productId: "   " }).ok).toBe(false);
});

test("productId is capped in length", () => {
  const r = parseReviewInput({ ...valid, productId: "a".repeat(PRODUCT_ID_MAX + 1) });
  expect(r.ok).toBe(false);
  expect(r.error).toContain("64");
});

test("a cuid-shaped productId is accepted", () => {
  for (const good of ["clx123abc456", "c0abc123", "a", "A-b_c9"]) {
    expect(parseReviewInput({ ...valid, productId: good }).ok).toBe(true);
  }
});