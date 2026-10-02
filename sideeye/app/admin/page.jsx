import { requireAdmin } from "../../lib/guards.js";

export const metadata = {
  title: "Admin — SideEye",
};

/**
 * Admin landing page.
 *
 * `requireAdmin()` reads the User row from Postgres and checks the role server-side, so
 * a non-admin cannot reach this by URL. Deliberately does not rely on the middleware or
 * on hiding the nav link (plan 02 Review Focus: "checked server-side (not just hidden
 * links)").
 *
 * The real dashboard (spec §8) is built in Plan 05.
 */
export default async function AdminPage() {
  const admin = await requireAdmin();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Admin</h1>
      <p className="mt-2 text-neutral-600">
        Signed in as an administrator (user id{" "}
        <code className="rounded bg-neutral-100 px-1 py-0.5 text-sm">{admin.id}</code>).
      </p>

      <p className="mt-8 rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-600">
        Products, orders, coupons and review moderation arrive in Plan 05. This page
        exists now so the admin role gate can be exercised end to end.
      </p>
    </div>
  );
}
