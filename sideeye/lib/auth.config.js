/**
 * Edge-safe Auth.js configuration.
 *
 * Contains ONLY what the Edge runtime may evaluate: provider setup, session strategy,
 * custom pages. It must not import Prisma, `pg`, or anything Node-only — `proxy.js`
 * imports this file.
 *
 * Database-touching callbacks (the Google sign-in User sync) live in `lib/auth.js`,
 * which extends this config for the Node runtime.
 *
 * @type {import("next-auth").NextAuthConfig}
 */
import Google from "next-auth/providers/google";

export const authConfig = {
  // AUTH_SECRET is the v5 name; NEXTAUTH_SECRET is kept as a fallback because that is
  // what .env.example has always carried.
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,

  trustHost: true,

  session: { strategy: "jwt" },

  providers: [
    // Use the Google() helper rather than a hand-rolled provider object: the helper
    // supplies the authorization/token/userinfo endpoints. A bare `{ type: "oauth" }`
    // object fails at runtime with
    //   InvalidEndpoints: Provider "google" is missing both `issuer` and `authorization`
    // which Auth.js surfaces to the browser as a generic HTTP 500.
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: { params: { scope: "openid email profile" } },
    }),
  ],

  pages: {
    signIn: "/login",
    error: "/login",
  },
};
