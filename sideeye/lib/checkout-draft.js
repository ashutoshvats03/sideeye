import { validateAddressInput } from "./address-input.js";

/**
 * Checkout wizard draft (pure helpers; localStorage access lives in the
 * client component). Step 1 (address) survives leaving checkout for the
 * cart: the draft is written on every keystroke and reloaded on mount, so
 * going Previous → cart → qty change → Next still shows the typed address.
 */

/** localStorage key for the in-progress checkout draft. */
export const DRAFT_KEY = "sideeye-checkout-draft";

/**
 * Parse a stored draft back into shape. Anything unexpected → null (a
 * corrupt or foreign draft must never break checkout).
 *
 * @param {unknown} raw parsed JSON from storage
 * @returns {{selectedId: string, address: object, couponCode: string} | null}
 */
export function parseDraft(raw) {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const { selectedId, address, couponCode } = raw;
  if (typeof selectedId !== "string" || selectedId === "") return null;
  if (address == null || typeof address !== "object" || Array.isArray(address)) return null;
  return {
    selectedId,
    address,
    couponCode: typeof couponCode === "string" ? couponCode : "",
  };
}

/**
 * Step 1 gate for the Next button. A saved-address selection is complete as
 * chosen; a new address must pass the same checks the server enforces.
 *
 * @param {unknown} selectedId saved address id or "new"
 * @param {unknown} address inline address fields
 * @returns {{ok: true} | {ok: false, error: string}}
 */
export function isAddressStepComplete(selectedId, address) {
  if (typeof selectedId !== "string" || selectedId === "") {
    return { ok: false, error: "Choose an address to continue." };
  }
  if (selectedId !== "new") return { ok: true };
  const checked = validateAddressInput(address);
  if (!checked.ok) return { ok: false, error: checked.error };
  return { ok: true };
}
