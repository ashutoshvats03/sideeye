"use server";

import { signIn, signOut } from "../lib/auth.js";
import { sanitizeCallbackUrl } from "../lib/protected.js";

/**
 * Server action for the "Continue with Google" button.
 *
 * Must be a server action rather than a raw POST to `/api/auth/signin/google`: Auth.js
 * v5 requires a CSRF token on that endpoint, and a plain HTML form cannot mint one.
 * Posting without it fails with `error=MissingCSRF` and bounces straight back to
 * /login. Verified by clicking the button against a production build.
 *
 * The redirect target is re-sanitized here because the hidden field is client-supplied
 * and a tampered value must not be able to bounce a freshly authenticated user offsite.
 */
export async function signInAction(formData) {
  const requested = formData.get("redirectTo");
  const redirectTo = sanitizeCallbackUrl(
    typeof requested === "string" ? requested : null,
    "/account",
  );

  // `prompt: "select_account"` forces Google's account chooser on every login.
  // Without it, Google's own SSO cookie silently re-authenticates whoever logged
  // in last — logging out of the shop then "logging in" as someone else would
  // land straight back in the first account with no chooser.
  await signIn("google", { redirectTo }, { prompt: "select_account" });
}

/**
 * Server action for the "Log out" button.
 *
 * A server action rather than a POST to `/api/auth/signout` so the CSRF token Auth.js
 * expects is generated for us and the session cookie is cleared on the server.
 */
export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
