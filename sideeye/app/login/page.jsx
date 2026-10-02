import Image from "next/image";
import { resolveErrorMessage } from "../../lib/login-errors.js";
import { sanitizeCallbackUrl } from "../../lib/protected.js";
import { signInAction } from "../actions.js";

export const metadata = {
  title: "Log in — SideEye",
  description: "Sign in with Google to check out and track your orders.",
};

/** Human copy for the `error` query param lives in lib/login-errors.js so it is unit tested. */

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;

  // Sanitized: this value is reflected into a hidden form field and later used as a
  // redirect target, so an attacker must not be able to smuggle an off-site URL in.
  const callbackUrl = sanitizeCallbackUrl(params?.callbackUrl, "/");
  const errorMessage = resolveErrorMessage(params?.error);

  return (
    <div className="flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        <Image
          src="/brand/logo-lockup-red.png"
          alt="SideEye"
          width={112}
          height={112}
          preload
          className="mx-auto h-28 w-28 object-contain"
        />

        <h1 className="font-display mt-6 text-3xl font-extrabold tracking-tight text-neutral-900">
          Log in
        </h1>
        <p className="mt-2 text-neutral-600">
          One tap with Google. No password to forget.
        </p>

        {errorMessage ? (
          <p
            role="alert"
            className="mt-6 rounded-2xl border border-brand-red/30 bg-brand-red/5 px-4 py-3 text-sm font-semibold text-brand-red-dark"
          >
            {errorMessage}
          </p>
        ) : null}

        {/*
          A server action, NOT a POST to `/api/auth/signin/google`: Auth.js v5 requires
          a CSRF token on that endpoint and a plain form cannot mint one (it fails with
          error=MissingCSRF). Progressive enhancement still holds — the form works
          without client JS. Using a real <form> (not onClick) keeps it keyboard-accessible.
        */}
        <form action={signInAction} className="mt-8">
          <input type="hidden" name="redirectTo" value={callbackUrl} />
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-neutral-900 px-6 py-4 text-base font-bold text-neutral-900 transition hover:bg-neutral-900 hover:text-white focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
          >
            <GoogleMark />
            Continue with Google
          </button>
        </form>

        <p className="mt-6 text-sm text-neutral-500">
          By continuing you agree to our terms and privacy policy.
        </p>
      </div>
    </div>
  );
}

/** Google's brand mark, inlined so the button renders without an extra request. */
function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.93l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.29v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.27a7.2 7.2 0 0 1 0-4.54V6.64H1.29a12 12 0 0 0 0 10.72l4-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.64l4 3.09C6.23 6.86 8.88 4.75 12 4.75Z"
      />
    </svg>
  );
}
