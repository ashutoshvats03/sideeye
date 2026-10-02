/**
 * App User sync, driven by a successful Google sign-in.
 *
 * Kept separate from `lib/auth.js` so the database-touching rules can be unit tested
 * against a real Postgres without booting Auth.js.
 *
 * Privacy: this module never logs an email address or any token. Callers may log a
 * user id only (see AGENTS.md "Never log PII/tokens").
 */

import { prisma } from "./prisma.js";
import { ROLE_ADMIN, ROLE_CUSTOMER, isAdminRole } from "./roles.js";

export { ROLE_ADMIN, ROLE_CUSTOMER, isAdminRole };

/**
 * Email address used to auto-grant the first admin (spec §8 "First admin seeded by
 * env email"). Empty/unset means nobody is auto-promoted.
 *
 * @param {Record<string, string|undefined>} [env]
 * @returns {string} lowercase email, or "" when unset
 */
export function adminEmailFromEnv(env = process.env) {
  const raw = env.ADMIN_EMAIL;
  return typeof raw === "string" ? raw.trim().toLowerCase() : "";
}

/**
 * Create-or-update the app User for a Google profile.
 *
 * Upserts on the unique `email`, so repeated sign-ins — including double-clicking the
 * Google button — converge on exactly one row (plan 02 Review Focus).
 *
 * A user with `isActive = false` is refused: the account has been deactivated by an
 * admin and must not be usable even though Google still considers the session valid.
 *
 * @param {{email?: string|null, name?: string|null, image?: string|null}} profile
 * @param {{now?: Date, adminEmail?: string}} [options]
 * @returns {Promise<{ok: true, user: object} | {ok: false, reason: "missing_email"|"inactive", user?: object}>}
 */
export async function syncUserFromOAuth(profile, options = {}) {
  const now = options.now ?? new Date();
  const adminEmail =
    options.adminEmail !== undefined ? options.adminEmail : adminEmailFromEnv();

  const email = typeof profile?.email === "string" ? profile.email.trim().toLowerCase() : "";
  if (!email) return { ok: false, reason: "missing_email" };

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      // Only refresh these when Google actually sent them; a missing value must not wipe
      // what we already know (e.g. a name the user typed in later).
      ...(profile.name ? { name: profile.name } : {}),
      ...(profile.image ? { avatar: profile.image } : {}),
      lastLoginAt: now,
    },
    create: {
      email,
      name: profile.name ?? null,
      avatar: profile.image ?? null,
      role: ROLE_CUSTOMER,
      isActive: true,
      lastLoginAt: now,
    },
  });

  if (user.isActive === false) return { ok: false, reason: "inactive", user };

  // First admin by env email (spec §8). Idempotent: only promotes, never demotes.
  if (adminEmail && user.email === adminEmail && user.role !== ROLE_ADMIN) {
    const promoted = await prisma.user.update({
      where: { id: user.id },
      data: { role: ROLE_ADMIN },
    });
    return { ok: true, user: promoted };
  }

  return { ok: true, user };
}
