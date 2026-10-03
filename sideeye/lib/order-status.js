/**
 * Order status state machine — the single owner of legal transitions.
 *
 * Until this module, `Order.status` was a bare string whose seven legal values
 * lived only in a schema comment, and nothing enforced a move. Every status
 * write in the app (customer cancel, admin advance/cancel/refund) goes through
 * `canTransition` / `assertTransition` here.
 *
 * Map: pending → confirmed → packed → shipped → delivered, with
 * cancel only from pending/confirmed and refund only after delivery.
 */

/** All seven legal statuses (spec §6, Plan 04). */
export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

/** Legal outbound moves per status. Terminal statuses map to []. */
export const TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["packed", "cancelled"],
  packed: ["shipped"],
  shipped: ["delivered"],
  delivered: ["refunded"],
  cancelled: [],
  refunded: [],
};

/**
 * @param {unknown} status
 * @returns {boolean}
 */
export function isOrderStatus(status) {
  return typeof status === "string" && ORDER_STATUSES.includes(status);
}

/**
 * Legal next statuses from `from`. Unknown statuses yield [].
 *
 * @param {unknown} from
 * @returns {string[]}
 */
export function legalTargets(from) {
  if (!isOrderStatus(from)) return [];
  return [...TRANSITIONS[from]];
}

/**
 * @param {unknown} from
 * @param {unknown} to
 * @returns {boolean}
 */
export function canTransition(from, to) {
  if (!isOrderStatus(from) || !isOrderStatus(to)) return false;
  return TRANSITIONS[from].includes(to);
}

/**
 * Throw a human-readable error when a move is illegal, naming the legal
 * moves so the admin UI can show what is actually possible.
 *
 * @param {unknown} from
 * @param {unknown} to
 * @throws {Error} `Cannot move order from "x" to "y". Legal: a, b.`
 */
export function assertTransition(from, to) {
  if (canTransition(from, to)) return;
  const legal = legalTargets(from);
  const hint = legal.length > 0 ? `Legal: ${legal.join(", ")}.` : "No moves are legal.";
  throw new Error(`Cannot move order from "${from}" to "${to}". ${hint}`);
}
