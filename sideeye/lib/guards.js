/**
 * Route guards.
 *
 * `proxy.js` does the cheap, unauthenticated redirect (is there a session at all?).
 * These guards are the AUTHORITATIVE check: they re-read the `User` row from Postgres on
 * every protected request, so `isActive = false` or a demoted `role` takes effect
 * immediately rather than waiting for the JWT to expire (spec §9, plan 02 Review Focus:
 * "checked server-side (not just hidden links)").
 *
 * The pure helpers (`requiresAuth`, `loginUrlFor`, `isAdminRole`) are exported separately
 * so they can be unit tested without a Next.js request context.
 */

import { redirect } from "next/navigation";
import { auth } from "./auth.js";
import { prisma } from "./prisma.js";
import { isAdminRole } from "./roles.js";
import { loginUrlFor, requiresAuth, PROTECTED_PREFIXES } from "./protected.js";

// Re-exported so server components can import one place for both helpers and guards.
export { isAdminRole, loginUrlFor, requiresAuth, PROTECTED_PREFIXES };

/**
 * The current app User, straight from the database.
 *
 * Returns `null` when there is no session, when the session has no matching row, or
 * when the row is deactivated. Never returns a partial user.
 *
 * @returns {Promise<object|null>}
 */
export async function getCurrentUser() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      avatar: true,
    },
  });

  if (!user || user.isActive === false) return null;
  return user;
}

/**
 * Require any signed-in, active user. Redirects to login otherwise.
 *
 * @param {string} [callbackUrl] defaults to the current path when called from a page
 * @returns {Promise<object>} the app User row
 */
export async function requireUser(callbackUrl) {
  const user = await getCurrentUser();
  if (user) return user;

  const target = callbackUrl ?? "/";
  redirect(loginUrlFor(target));
}

/**
 * Require an active ADMIN. Redirects to login when signed out and to home when signed
 * in without the role.
 *
 * @returns {Promise<object>} the app User row
 */
export async function requireAdmin() {
  const user = await requireUser();
  if (!isAdminRole(user.role)) redirect("/");
  return user;
}
