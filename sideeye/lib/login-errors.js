/**
 * Login page error copy.
 *
 * Kept out of the JSX so it can be unit tested: the important guarantee is that a
 * shopper NEVER sees a bare Auth.js machine code, and that a failed sign-in never
 * renders what looks like a clean login form.
 *
 * Pure and dependency-free.
 */

/** Known Auth.js error codes and their human copy. */
export const LOGIN_ERROR_MESSAGES = {
  AccessDenied: "That Google account is not allowed to sign in here.",
  OAuthSignin: "Google sign-in failed. Please try again.",
  OAuthCallback: "Google sign-in did not complete. Please try again.",
  OAuthAccountNotLinked:
    "That email is already registered with a different sign-in method.",
  Configuration: "Sign-in is misconfigured. Please contact support.",
  Verification: "Sign-in could not be verified. Please try again.",
};

/** Shown for any code we have no specific copy for, including ones Auth.js adds later. */
export const GENERIC_LOGIN_ERROR =
  "Sign-in did not go through. Please try again.";

/**
 * Resolve an `error` query param to displayable copy.
 *
 * Fails closed: anything present but not understood still yields a message. Showing a
 * clean login form on an errored URL reads to the shopper as "it worked", which is the
 * worst possible outcome for a failed sign-in. Only a genuinely absent param is silent.
 *
 * A raw code is never echoed back — it is untrusted reflected input.
 *
 * @param {string|string[]|null|undefined} errorCode raw `error` search param
 * @returns {string|null} message, or null only when there is no error at all
 */
export function resolveErrorMessage(errorCode) {
  const code = Array.isArray(errorCode) ? errorCode[0] : errorCode;

  // Absent, null and empty string are the only "no error" cases.
  if (code === undefined || code === null || code === "") return null;

  if (typeof code !== "string") return GENERIC_LOGIN_ERROR;

  return LOGIN_ERROR_MESSAGES[code] ?? GENERIC_LOGIN_ERROR;
}