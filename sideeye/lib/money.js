/**
 * Paise money helpers.
 *
 * INVARIANT (spec §2, AGENTS.md): money is stored and computed as integer paise.
 * Floats are only ever introduced at the display boundary, and even then the
 * formatting is done with string slicing so no float arithmetic is involved.
 * 1 rupee = 100 paise.
 */

/** Rupee sign used across the storefront. */
export const RUPEE_SIGN = "\u20B9"; // ₹

/**
 * Format integer paise as a display string, e.g. 19999 -> "₹199.99".
 *
 * Uses integer division + modulo (never `paise / 100` into a float) so values like
 * 123456789 paise can never render as "₹1234567.8899999".
 *
 * @param {number} paise Integer paise. Negative values render with a leading "-".
 * @returns {string} e.g. "₹199.99"
 */
export function formatPaise(paise) {
  if (!Number.isInteger(paise)) {
    throw new TypeError(`formatPaise expects integer paise, got ${paise}`);
  }

  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  const rupees = Math.floor(abs / 100);
  const remainder = abs % 100;

  return `${sign}${RUPEE_SIGN}${rupees}.${String(remainder).padStart(2, "0")}`;
}

/**
 * Sum integer paise values safely.
 *
 * @param {...number} values
 * @returns {number} integer sum
 */
export function sumPaise(...values) {
  let total = 0;
  for (const value of values) {
    if (!Number.isInteger(value)) {
      throw new TypeError(`sumPaise expects integer paise, got ${value}`);
    }
    total += value;
  }
  return total;
}
