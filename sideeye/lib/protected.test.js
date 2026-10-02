// Route-protection helpers. Pure, so no DB or Next.js request context needed.
import { test, expect } from "bun:test";
import {
  PROTECTED_PREFIXES,
  hasControlChars,
  loginUrlFor,
  requiresAuth,
  sanitizeCallbackUrl,
} from "./protected.js";

const NUL = String.fromCharCode(0);
const DEL = String.fromCharCode(127);
const LF = String.fromCharCode(10);
const TAB = String.fromCharCode(9);

test("protected prefixes are exactly checkout, account and admin", () => {
  expect(PROTECTED_PREFIXES).toEqual(["/checkout", "/account", "/admin"]);
});

test("requiresAuth covers the protected roots and their subpaths", () => {
  expect(requiresAuth("/checkout")).toBe(true);
  expect(requiresAuth("/checkout/payment")).toBe(true);
  expect(requiresAuth("/account")).toBe(true);
  expect(requiresAuth("/account/orders")).toBe(true);
  expect(requiresAuth("/admin")).toBe(true);
  expect(requiresAuth("/admin/products/new")).toBe(true);
});

test("requiresAuth leaves public routes alone", () => {
  expect(requiresAuth("/")).toBe(false);
  expect(requiresAuth("/shop")).toBe(false);
  expect(requiresAuth("/login")).toBe(false);
  expect(requiresAuth("/product/heart-pendant")).toBe(false);
});

test("requiresAuth is boundary-aware, not a naive prefix match", () => {
  // Regression guard: "/accounting" must NOT be treated as "/account".
  expect(requiresAuth("/accounting")).toBe(false);
  expect(requiresAuth("/administrators")).toBe(false);
  expect(requiresAuth("/checkoutx")).toBe(false);
});

test("requiresAuth handles junk input instead of throwing", () => {
  expect(requiresAuth("")).toBe(false);
  expect(requiresAuth(null)).toBe(false);
  expect(requiresAuth(undefined)).toBe(false);
  expect(requiresAuth(123)).toBe(false);
});

test("loginUrlFor preserves the destination as an encoded callbackUrl", () => {
  expect(loginUrlFor("/checkout")).toBe("/login?callbackUrl=%2Fcheckout");
  expect(loginUrlFor("/checkout", "?gift=1")).toBe(
    "/login?callbackUrl=%2Fcheckout%3Fgift%3D1",
  );
  expect(loginUrlFor("/account/orders")).toBe(
    "/login?callbackUrl=%2Faccount%2Forders",
  );
});

// --- open-redirect protection ---

test("sanitizeCallbackUrl keeps legitimate same-origin paths", () => {
  expect(sanitizeCallbackUrl("/checkout")).toBe("/checkout");
  expect(sanitizeCallbackUrl("/account/orders?page=2")).toBe("/account/orders?page=2");
  expect(sanitizeCallbackUrl("  /checkout  ")).toBe("/checkout");
});

test("sanitizeCallbackUrl rejects off-site targets", () => {
  expect(sanitizeCallbackUrl("//evil.com")).toBe("/");
  expect(sanitizeCallbackUrl("https://evil.com")).toBe("/");
  expect(sanitizeCallbackUrl("http://evil.com/steal")).toBe("/");
  expect(sanitizeCallbackUrl("javascript:alert(1)")).toBe("/");
  expect(sanitizeCallbackUrl("data:text/html,phish")).toBe("/");
});

test("sanitizeCallbackUrl rejects backslash and control-character tricks", () => {
  expect(sanitizeCallbackUrl("/\\evil.com")).toBe("/");
  expect(sanitizeCallbackUrl("/path" + LF + "Set-Cookie: x")).toBe("/");
  expect(sanitizeCallbackUrl("/path" + NUL + "null")).toBe("/");
});

test("sanitizeCallbackUrl falls back for empty and non-string input", () => {
  expect(sanitizeCallbackUrl("")).toBe("/");
  expect(sanitizeCallbackUrl("   ")).toBe("/");
  expect(sanitizeCallbackUrl(null)).toBe("/");
  expect(sanitizeCallbackUrl(undefined)).toBe("/");
  expect(sanitizeCallbackUrl(42)).toBe("/");
  expect(sanitizeCallbackUrl({})).toBe("/");
});

test("sanitizeCallbackUrl takes the first value when given an array", () => {
  expect(sanitizeCallbackUrl(["/checkout", "/admin"])).toBe("/checkout");
});

test("sanitizeCallbackUrl honours a custom fallback", () => {
  expect(sanitizeCallbackUrl("https://evil.com", "/shop")).toBe("/shop");
});

test("hasControlChars detects C0 and DEL but not normal text", () => {
  expect(hasControlChars("plain/path")).toBe(false);
  expect(hasControlChars("")).toBe(false);
  expect(hasControlChars("with space")).toBe(false);
  expect(hasControlChars("tab" + TAB + "separated")).toBe(true);
  expect(hasControlChars("newline" + LF + "here")).toBe(true);
  expect(hasControlChars("nul" + NUL + "byte")).toBe(true);
  expect(hasControlChars("del" + DEL + "char")).toBe(true);
});

// A round trip through loginUrlFor must stay safe: the generated callbackUrl is itself
// a same-origin path, so re-sanitising it is a no-op.
test("loginUrlFor output survives sanitizeCallbackUrl unchanged", () => {
  const url = loginUrlFor("/checkout", "?gift=1");
  const encoded = url.slice(url.indexOf("callbackUrl=") + "callbackUrl=".length);
  expect(sanitizeCallbackUrl(decodeURIComponent(encoded))).toBe("/checkout?gift=1");
});
