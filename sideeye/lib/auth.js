/**
 * Auth.js (NextAuth v5) configuration for the Node runtime — the full config.
 *
 * Extends the edge-safe `lib/auth.config.js` with the database-touching callbacks. The
 * session strategy is JWT: the app `User` row is synced by the `signIn` callback
 * (`lib/users.js`), so Auth.js needs no adapter tables (plan 02 architecture).
 *
 * Authorization is NOT decided here. `isActive` and role are re-read from Postgres on
 * every protected request by `lib/guards.js`, so a deactivated account or a demoted
 * admin loses access immediately instead of waiting for a JWT to expire.
 */

import NextAuth from "next-auth";
import { authConfig } from "./auth.config.js";
import { syncUserFromOAuth, isAdminRole } from "./users.js";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,

  callbacks: {
  /**
   * Returning `false` aborts the sign-in, which is how a deactivated user is denied.
   */
  async signIn({ user, account, profile }) {
    if (account?.provider !== "google") return false;

    const result = await syncUserFromOAuth({
      email: user.email ?? profile?.email,
      name: user.name ?? profile?.name,
      image: user.image ?? profile?.picture,
    });

    if (!result.ok) {
      return false;
    }

    // Surface the DB values (not Google's claims) to the JWT. Guards still re-read
    // Postgres; this only lets the UI render the right navbar state.
    user.id = result.user.id;
    user.role = result.user.role;
    return true;
  },

  async jwt({ token, user }) {
    if (user) {
      token.userId = user.id;
      token.role = user.role;
    }
    return token;
  },

  async session({ session, token }) {
    if (session.user) {
      session.user.id = token.userId ?? token.sub;
      // Convenience only — `isAdminRole` normalises casing, and requireAdmin()
      // re-checks the database anyway.
      session.user.isAdmin = isAdminRole(token.role);
    }
    return session;
  },
  },
});
