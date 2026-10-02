import { requireUser } from "../../lib/guards.js";

export const metadata = {
  title: "Account — SideEye",
};

/**
 * Account landing page.
 *
 * `requireUser()` is the authoritative gate: it reads the session, then re-reads the
 * User row so a deactivated account is bounced to /login even with a valid cookie.
 * (Middleware already redirected signed-out visitors; this is the defence in depth.)
 */
export default async function AccountPage() {
  const user = await requireUser("/account");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        Hey {user.name || "there"}
      </h1>
      <p className="mt-2 text-neutral-600">
        Your orders, addresses and saved details live here.
      </p>

      <dl className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 p-4">
          <dt className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Signed in as
          </dt>
          {/* Email is the user's own data shown to the user, not a log line. */}
          <dd className="mt-1 break-all font-semibold">{user.email}</dd>
        </div>
        <div className="rounded-2xl border border-neutral-200 p-4">
          <dt className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Role
          </dt>
          <dd className="mt-1 font-semibold">{user.role}</dd>
        </div>
      </dl>

      <p className="mt-8 rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-600">
        Order history and saved addresses arrive in Plan 04. This page exists now so the
        sign-in guard can be exercised end to end.
      </p>
    </div>
  );
}
