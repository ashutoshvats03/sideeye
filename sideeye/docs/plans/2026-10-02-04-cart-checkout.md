# Plan 04 — Cart + COD Checkout + Orders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cart, login-required COD checkout with coupons + suggestions, atomic order placement, success + tracking pages.

**Architecture:** Cart in localStorage (`[{slug, qty}]`); all money/coupon/stock logic in server actions re-reading Prisma; order placement in a single transaction with atomic stock decrement.

**Tech Stack:** Same as Plan 01 + zod for input schemas.

**Spec:** design spec §2, §6, §7.

## Global Constraints

- JavaScript only. `Order.userId` NOT NULL — server action rejects signed-out calls.
- Money integer paise; totals recomputed server-side via `computeTotals`; client totals display-only.
- Stock: atomic conditional decrement (`stockQty >= qty`), never read-then-write.
- Statuses: `pending → confirmed → packed → shipped → delivered`, plus `cancelled`/`refunded`; illegal transitions rejected.
- Payment v1: `COD` only. Razorpay placeholder UI disabled ("coming soon").
- Rate-limit coupon-apply and place-order per user.

## Review Focus

- Double-clicking Place Order creates exactly one Order (idempotency key).
- Last-item race: two simultaneous checkouts → one succeeds, one gets clean out-of-stock error.
- Tampered client totals (e.g. total=₹1) are ignored; server charges DB truth.
- User A cannot view/cancel User B's order (IDOR test).
- Cancelling a COD order restores stock AND returns coupon usage in the same transaction.

---

### Task 1: Coupon validation lib (TDD)

**Files:**
- Create: `sideeye/lib/coupons.js`
- Test: `sideeye/lib/coupons.test.js`

**Interfaces:**
- Consumes: Prisma Coupon/UserCoupon rows (plain objects in tests).
- Produces: `validateCoupon({code, userId, subtotalPaise}) -> coupon` or throws `CouponError(code: 'NOT_FOUND'|'INACTIVE'|'EXPIRED'|'MIN_ORDER'|'LIMIT_REACHED'|'NOT_ASSIGNED')`; handles generic + per-user (`UserCoupon`) assignment, `usageLimit`, `perUserLimit`.

- [ ] **Step 1: Write failing tests** (valid generic; expired rejected; below-min rejected; per-user coupon rejected for unassigned user; limit-reached rejected).
- [ ] **Step 2: Run to verify they fail** — `bun test lib/coupons.test.js` → FAIL (missing module).
- [ ] **Step 3: Implement `validateCoupon`.**
- [ ] **Step 4: Run tests** — `bun test` → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: add coupon validation with tests"`

### Task 2: Cart page

**Files:**
- Create: `sideeye/app/cart/page.jsx`, `sideeye/app/api/coupon/route.js` (POST validate → returns discount preview via `computeTotals`)

**Interfaces:**
- Consumes: Tasks 1 + Plan 01 pricing; cart shape `[{slug, qty}]`.
- Produces: qty edit, coupon input with error messages, summary, free-shipping progress bar ("Add ₹X more").

- [ ] **Step 1: Build cart + coupon API.**
- [ ] **Step 2: Verify** — bad code shows message; progress bar math matches server; empty cart state designed.
- [ ] **Step 3: Commit** — `git commit -m "feat: build cart with coupon and free-shipping bar"`

### Task 3: Checkout + place order (server action)

**Files:**
- Create: `sideeye/app/checkout/page.jsx`, `sideeye/actions/checkout.js`, `sideeye/app/order-success/page.jsx`, `sideeye/app/account/orders/page.jsx`, `sideeye/app/track/page.jsx`

**Interfaces:**
- Consumes: `requireUser`, `validateCoupon`, `computeTotals`, Prisma (Product/Order/OrderItem/UserCoupon/Address/StockReservation).
- Produces: `placeOrder({items, addressId|address, couponCode|null, idempotencyKey}) -> {orderNumber}` — zod-validated; transaction: re-read prices, validate coupon, atomic decrement, create Order (`status=confirmed`, `paymentMethod=COD`) + items + address snapshot, bump coupon usage; `lib/rate-limit.js` (in-memory per-user window) enforced on coupon API + `placeOrder`; checkout UI with address form + phone validation, COD radio + disabled prepaid placeholder, "Complete the look" rail that adds items without losing form state.

- [ ] **Step 1: Write failing order tests** (totals recomputed not trusted; double-submit one order; simultaneous last-item race → one success + clean out-of-stock; unauthorized order read rejected; cancel restores stock + coupon).
- [ ] **Step 2: Implement server action + pages.**
- [ ] **Step 3: Run tests + manual pass** — full COD flow to `/order-success`; `/track` finds order by number + phone; account lists own orders only.
- [ ] **Step 4: Commit** — `git commit -m "feat: build COD checkout with atomic order placement"`
