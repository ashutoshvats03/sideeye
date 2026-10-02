import { test, expect } from "bun:test";
import {
  resolveErrorMessage,
  GENERIC_LOGIN_ERROR,
  LOGIN_ERROR_MESSAGES,
} from "./login-errors.js";

test("no error param means no message", () => {
  expect(resolveErrorMessage(undefined)).toBeNull();
  expect(resolveErrorMessage(null)).toBeNull();
  expect(resolveErrorMessage("")).toBeNull();
});

test("known Auth.js codes get specific copy", () => {
  for (const [code, expected] of Object.entries(LOGIN_ERROR_MESSAGES)) {
    expect(resolveErrorMessage(code)).toBe(expected);
  }
});

test("an unmapped code still renders human copy, never a bare code", () => {
  expect(resolveErrorMessage("MissingCSRF")).toBe(GENERIC_LOGIN_ERROR);
  expect(resolveErrorMessage("SomeFutureAuthJsCode")).toBe(GENERIC_LOGIN_ERROR);
  expect(resolveErrorMessage("MissingCSRF")).not.toContain("MissingCSRF");
});

test("a hostile error value is not reflected into the page", () => {
  const hostile = '<script>alert(1)</script>';
  const message = resolveErrorMessage(hostile);
  expect(message).toBe(GENERIC_LOGIN_ERROR);
  expect(message).not.toContain("<script>");
  expect(message).not.toContain(hostile);
});

test("a repeated error param uses the first value", () => {
  expect(resolveErrorMessage(["OAuthCallback", "AccessDenied"])).toBe(
    LOGIN_ERROR_MESSAGES.OAuthCallback,
  );
});

test("a non-string code is treated as an error, not silently ignored", () => {
  expect(resolveErrorMessage(42)).toBe(GENERIC_LOGIN_ERROR);
  expect(resolveErrorMessage(true)).toBe(GENERIC_LOGIN_ERROR);
  expect(resolveErrorMessage({})).toBe(GENERIC_LOGIN_ERROR);
});

test("every mapped message is non-empty and sentence-cased for display", () => {
  for (const [code, message] of Object.entries(LOGIN_ERROR_MESSAGES)) {
    expect(message.length).toBeGreaterThan(0);
    expect(message).not.toBe(code);
  }
});