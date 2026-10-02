/**
 * Role constants and the admin predicate.
 *
 * Dependency-free on purpose: `middleware.js` (Edge runtime) needs `isAdminRole` and
 * must not transitively import anything Node-only.
 *
 * Spec §7/§24 specify lowercase `customer|admin`; plan 02 wrote `role === "ADMIN"`.
 * The comparison is case-insensitive so both spellings work (see AGENTS.md rule: spec is
 * authority, but a hand-edited row must not silently lock an admin out).
 */

export const ROLE_CUSTOMER = "customer";
export const ROLE_ADMIN = "admin";

/**
 * @param {string|null|undefined} role
 * @returns {boolean}
 */
export function isAdminRole(role) {
  return typeof role === "string" && role.trim().toLowerCase() === ROLE_ADMIN;
}
