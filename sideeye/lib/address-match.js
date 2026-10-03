/**
 * Address dedupe comparison for checkout autosave.
 *
 * When a shopper types an address at checkout, placeOrder saves it to their
 * address book — but only when no identical row already exists, so repeat
 * orders don't pile up duplicates. Comparison normalises the two ways "no
 * line 2" is stored (null from older rows, "" from the checkout form) and
 * trims stray whitespace. Labels are deliberately ignored: an autosaved
 * "Delivery" row and a hand-labelled "Home" row with the same fields are the
 * same address.
 */

const FIELDS = ["name", "phone", "line1", "line2", "city", "state", "pincode"];

function norm(value) {
  return (value ?? "").toString().trim();
}

/**
 * @param {unknown} a
 * @param {unknown} b
 * @returns {boolean} true when both hold the same delivery address
 */
export function isSameAddress(a, b) {
  if (!a || typeof a !== "object" || !b || typeof b !== "object") return false;
  return FIELDS.every((f) => norm(a[f]) === norm(b[f]));
}
