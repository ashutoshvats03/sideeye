import Link from "next/link";
import { requireUser } from "../../lib/guards.js";
import ProfileForm from "./profile-form.jsx";

export const metadata = {
  title: "Account — SideEye",
};

export const dynamic = "force-dynamic";

function formatDob(dob) {
  if (!dob) return "Not set";
  return new Date(dob).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Account landing page: a profile card plus two link blocks (spec/plan 05).
 *
 * Deliberately NOT a dashboard — no order counts, no order rows, no money
 * anywhere on this page (owner decision). `/account/orders` is the record;
 * this page is the profile and the way in.
 */
export default async function AccountPage() {
  const user = await requireUser("/account");
  const initial = (user.name || user.email || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        Hey {user.name || "there"}
      </h1>

      <section
        aria-label="Profile"
        className="mt-8 rounded-3xl bg-surface p-6 ring-1 ring-neutral-200 sm:p-8"
      >
        <div className="flex items-center gap-4">
          {user.avatar ? (
            // Plain <img> on purpose: the avatar host comes from a live Google
            // session and is unconfirmed, so no images.remotePatterns guess.
            <img
              src={user.avatar}
              alt=""
              width={64}
              height={64}
              className="h-16 w-16 rounded-full object-cover ring-1 ring-neutral-200"
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-2xl font-extrabold text-white"
            >
              {initial}
            </span>
          )}
          <div>
            <p className="text-xl font-bold">{user.name || "SideEye shopper"}</p>
            {/* Email is the user's own data shown to the user, not a log line. */}
            <p className="break-all text-sm text-neutral-600">{user.email}</p>
          </div>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-neutral-200 p-4">
            <dt className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Birthday
            </dt>
            <dd className="mt-1 font-semibold">{formatDob(user.dateOfBirth)}</dd>
          </div>
          <div className="rounded-2xl border border-neutral-200 p-4">
            <dt className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Phone
            </dt>
            <dd className="mt-1 font-semibold">{user.phone || "Not set"}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-neutral-600">
          Signed in with Google — your email stays as-is.
        </p>

        <ProfileForm
          initialName={user.name || ""}
          initialDob={user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().slice(0, 10) : ""}
          initialPhone={user.phone || ""}
        />
      </section>

      <nav aria-label="Account sections" className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link
          href="/account/addresses"
          className="rounded-3xl bg-surface p-6 ring-1 ring-neutral-200 transition hover:ring-brand"
        >
          <p className="text-lg font-bold">Addresses</p>
          <p className="mt-1 text-sm text-neutral-600">Saved delivery addresses.</p>
        </Link>
        <Link
          href="/account/orders"
          className="rounded-3xl bg-surface p-6 ring-1 ring-neutral-200 transition hover:ring-brand"
        >
          <p className="text-lg font-bold">Orders</p>
          <p className="mt-1 text-sm text-neutral-600">Track and revisit your orders.</p>
        </Link>
      </nav>
    </div>
  );
}
