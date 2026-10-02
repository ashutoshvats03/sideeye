/**
 * Route-protection constants and pure helpers.
 *
 * Deliberately dependency-free: `proxy.js` runs on the Edge runtime, so it must not
 * (transitively) import anything Node-only. `lib/guards.js` re-exports from here so
 * server components get the same helpers plus the database-backed guards.
 */

/**
 * Prefixes that require a signed-in user.
 * Must stay in sync with the `matcher` in `middleware.js`.
 */
export const PROTECTED_PREFIXES = ["/checkout", "/account", "/admin"];

/**
 * Does this path need a session?
 *
 * Boundary-aware on purpose: `/accounting` must not be swept up by the `/account`
 * prefix, or an unrelated public page would start redirecting to login.
 *
 * @param {string} pathname
 * @returns {boolean}
 */
export function requiresAuth(pathname) {
  if (typeof pathname !== "string" || pathname === "") return false;
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Login URL that returns the visitor to where they were headed (plan 02 Review Focus:
 * signed-out `/checkout` lands back on checkout after login).
 *
 * @param {string} pathname
 * @param {string} [search]
 * @param {string} [base]
 * @returns {string}
 */
export function loginUrlFor(pathname, search = "", base = "/login") {
  const callback = `${pathname || "/"}${search || ""}`;
  return `${base}?callbackUrl=${encodeURIComponent(callback)}`;
}

/**
 * True when the string contains a C0 control character or DEL. Written as a codepoint
 * walk rather than a regex literal so no raw control byte ever lives in this source file.
 *
 * @param {string} value
 * @returns {boolean}
 */
export function hasControlChars(value) {
  for (const ch of value) {
    const code = ch.codePointAt(0);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/**
 * Make a user-supplied `callbackUrl` safe to redirect to.
 *
 * `callbackUrl` arrives from the query string, so it is fully attacker-controlled and
 * must never be echoed into a form action unfiltered (open-redirect risk). Only
 * same-origin, path-absolute values survive:
 *   - `//evil.com` and `https://evil.com` are rejected (protocol-relative / absolute)
 *   - `/\evil.com` is rejected (browsers normalise backslash to slash)
 *   - control characters are rejected
 *   - anything unusable falls back to "/"
 *
 * @param {unknown} value raw query-string value (may be string | string[] | null)
 * @param {string} [fallback]
 * @returns {string} a safe path beginning with a single "/"
 */
export function sanitizeCallbackUrl(value, fallback = "/") {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string") return fallback;

  const candidate = raw.trim();
  if (candidate === "") return fallback;

  // Must start with exactly one slash, which already rules out absolute URLs.
  if (!candidate.startsWith("/")) return fallback;
  if (candidate.startsWith("//")) return fallback;
  if (candidate.includes("\\")) return fallback;
  if (hasControlChars(candidate)) return fallback;

  return candidate;
}
