# Challenges — Plan 05 final review findings (fixed)

Found by a fresh-context review of the Plan 05 branch, fixed in commit
`0c2e40a`. Each fix was written test-first (failing test → fix → green).

## 1. FLAT coupons were 100x too small (Critical)

**What was wrong:** the admin coupon form labelled the field "Amount (₹)" but
sent the raw number to the server. The pricing engine stores FLAT values in
integer paise, so typing `50` (meaning ₹50) created a 50-paise (₹0.50) coupon —
shoppers would have been charged more than advertised. Editing made it worse:
a real ₹50 coupon prefilled as `5000`, so "correcting" it to `50` collapsed it.

**Fix:** new `sideeye/lib/coupon-form.js` — the form converts FLAT rupees to
paise on submit and converts back to rupees when prefilling the edit form
(7 unit tests). Checked the live DB: the existing `FLAT50` coupon is
5000 paise = ₹50 (seeded correctly, nothing to repair).

## 2. Cancelling crashed on orders containing a deleted product (Important)

**What was wrong:** deleting a product sets its order-item `productId` to NULL
(history is kept on purpose). The customer cancel path fed that `null` into a
stock update, which threw — so the order could never be cancelled.

**Fix:** new `sideeye/lib/order-restore.js` — restore loops in both the
customer and admin cancel paths skip lines with no live product (3 unit
tests). The order history still shows what was bought; there is just no
product row left to put stock back into.

## 3. Double-clicking Cancel restored stock and coupons twice (Important)

**What was wrong:** the order status was read, then the writes happened in a
transaction — but nothing re-checked the status inside it. Two concurrent
requests (e.g. a double-clicked Cancel button) both passed the check and both
restored stock + coupon usage; coupon counts could even go negative.

**Fix:** both cancel paths now claim the transition first with a conditional
database write inside the transaction (`legalSources` added to
`sideeye/lib/order-status.js`, tested). Only the first request matches; the
second matches zero rows, writes nothing, and the shopper sees "This order
was already updated. Please reload the page." The customer coupon restore is
also guarded so the count can never go below zero.

## Verification

- `bun test` → 266/266 pass (25 files)
- `bun run lint` → 0 errors (1 pre-existing documented warning)
- `bun run build` → 32 routes, clean
