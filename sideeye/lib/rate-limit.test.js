import { test, expect } from "bun:test";
import { checkRateLimit, resetRateLimits, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX } from "./rate-limit.js";

// --- checkRateLimit ---

test("allows requests up to the limit, then blocks", () => {
  resetRateLimits();
  const key = "user-1";
  for (let i = 0; i < RATE_LIMIT_MAX; i++) {
    expect(checkRateLimit(key).allowed).toBe(true);
  }
  expect(checkRateLimit(key).allowed).toBe(false);
});

test("tracks keys independently", () => {
  resetRateLimits();
  const a = "user-a";
  const b = "user-b";
  for (let i = 0; i < RATE_LIMIT_MAX; i++) checkRateLimit(a);
  expect(checkRateLimit(a).allowed).toBe(false);
  expect(checkRateLimit(b).allowed).toBe(true);
});

test("a blocked key reports a positive retry-after", () => {
  resetRateLimits();
  const key = "user-retry";
  for (let i = 0; i < RATE_LIMIT_MAX; i++) checkRateLimit(key);
  const result = checkRateLimit(key);
  expect(result.allowed).toBe(false);
  expect(result.retryAfterMs).toBeGreaterThan(0);
});

test("the window slides: after it expires the key is allowed again", () => {
  resetRateLimits();
  const key = "user-window";
  for (let i = 0; i < RATE_LIMIT_MAX; i++) checkRateLimit(key);
  expect(checkRateLimit(key).allowed).toBe(false);

  // Move time forward past the window.
  const realNow = Date.now;
  Date.now = () => realNow() + RATE_LIMIT_WINDOW_MS + 1;
  try {
    expect(checkRateLimit(key).allowed).toBe(true);
  } finally {
    Date.now = realNow;
  }
});

test("resetRateLimits clears all state", () => {
  resetRateLimits();
  const key = "user-reset";
  for (let i = 0; i < RATE_LIMIT_MAX; i++) checkRateLimit(key);
  expect(checkRateLimit(key).allowed).toBe(false);
  resetRateLimits();
  expect(checkRateLimit(key).allowed).toBe(true);
});
