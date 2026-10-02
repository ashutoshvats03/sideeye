/**
 * In-memory sliding-window rate limiter.
 *
 * Used to throttle coupon-apply and place-order per user (plan Global Constraints).
 * In-memory is deliberate: this is a single-process dev deployment, and the limit is
 * against accidental double-clicks and casual abuse, not a determined attacker — a
 * multi-instance deployment would swap this for Redis behind the same two-function API.
 */

/** Window length in milliseconds. */
export const RATE_LIMIT_WINDOW_MS = 60_000;

/** Maximum requests allowed per key within the window. */
export const RATE_LIMIT_MAX = 5;

/** @type {Map<string, number[]>} key -> timestamps of requests inside the window */
const hits = new Map();

/**
 * Record a request for `key` and report whether it is allowed.
 *
 * Sliding window: timestamps older than `RATE_LIMIT_WINDOW_MS` are dropped before the
 * count is taken, so the limit is "N requests in any rolling window" rather than a
 * fixed bucket that resets abruptly.
 *
 * @param {string} key
 * @param {number} [now] injectable clock for tests
 * @returns {{allowed: boolean, retryAfterMs: number}}
 */
export function checkRateLimit(key, now = Date.now()) {
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const recent = (hits.get(key) ?? []).filter((t) => t > windowStart);

  if (recent.length >= RATE_LIMIT_MAX) {
    // Retry after the oldest hit in the window ages out.
    const retryAfterMs = Math.max(0, recent[0] + RATE_LIMIT_WINDOW_MS - now);
    hits.set(key, recent);
    return { allowed: false, retryAfterMs };
  }

  recent.push(now);
  hits.set(key, recent);
  return { allowed: true, retryAfterMs: 0 };
}

/**
 * Clear all rate-limit state. Used by tests; a running server never calls this.
 */
export function resetRateLimits() {
  hits.clear();
}
