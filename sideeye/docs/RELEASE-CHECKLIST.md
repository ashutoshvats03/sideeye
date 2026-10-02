# Release checklist — user tests + security tests

Branch `ngrok-branchh` goes to production only after both passes below are green.
Tunnel setup for the testing passes: [`NGROK-TESTING.md`](./NGROK-TESTING.md).

Status legend: `[ ]` todo · `[x]` done · `[!]` known gap, blocks production.

---

## 0. Known gaps (fix before push)

- `[!]` **Coupon apply is not rate limited.** `app/api/coupon/route.js` says rate limiting was added in
  Plan 04 Task 3, but it never was — `checkRateLimit` is only called in `actions/checkout.js`
  (`place-order:${user.id}`). The Global Constraints require checkout/coupon/login to be limited.
  Fix: call `checkRateLimit` in the coupon route, keyed per user id when signed in, else per client IP.
- `[!]` **Login is not rate limited.** No limiter on the Auth.js POST. Google throttles its own
  consent endpoint, but the app-side guard from the constraints is missing.
- `[ ]` **Admin panel is a stub.** `app/admin/page.jsx` is a role-gate placeholder; the real dashboard,
  orders, stock edit and coupons list are Plan 05 (`docs/plans/2026-10-02-05-admin.md`). Either build
  Plan 05 or ship v1 without the admin UI and remove the nav link.
- `[ ]` **Rate limiter is in-memory.** Fine for one process (`lib/rate-limit.js`); a multi-instance
  deploy needs Redis behind the same two-function API.
- `[ ]` **Razorpay is deferred.** v1 is COD only by decision (`docs/` + `README-RAZORPAY.md` guide).

## 1. Automated gates

- `[x]` `bun test` — 217 pass / 0 fail / 505 expects
- `[x]` `bun run lint` — clean
- `[x]` `bunx prisma validate` — clean
- `[x]` `bunx prisma migrate status` — no drift
- `[x]` `bun run build` — clean (24 routes)
- `[ ]` Re-run all five on the final commit before pushing.

## 2. User test pass (phone, over the tunnel)

- `[ ]` Home renders: hero, photo carousel, vibe/category entry points, footer.
- `[ ]` Shop: filter by category (Necklace, Earring, Anklet, Ring, Bracelet, Arm Bracelet) and by
      vibe badge (Eye Special, Funky, Queen, Slay, Baddie); filters combine; empty state reads well.
- `[ ]` Product page: images, price in ₹, vibe badges, stock state, review list + write a review.
- `[ ]` Cart: add from product page and shop grid; qty stepper; Remove; Clear bag (confirm-guarded);
      totals incl. shipping (₹49 flat, free at/above ₹999).
- `[ ]` Coupon apply: valid code reduces totals; invalid/expired code shows a readable error.
- `[ ]` Google login from the phone (this is the whole point of the tunnel run).
- `[ ]` After login the shopper returns to the page they came from (callbackUrl preserved from the
      navbar Log in link, including mid-checkout and `/order-success?order=<n>`).
- `[ ]` Checkout: address form validation, COD only, place order, confirmation shows order number.
- `[ ]` `/account/orders`: order listed, cancel works, stock and coupon are restored.
- `[ ]` Cancel an order, then re-checkout: the coupon applies again and stock is available.
- `[ ]` Track order page with a real order number.
- `[ ]` Mobile layout at 360px width; tap targets and focus order are sane; no horizontal scroll.
- `[ ]` Admin gate: the admin account reaches `/admin`; a normal Google account is refused.

## 3. Security test pass

### Secrets and config
- `[ ]` `git ls-files | findstr /i env` — only `.env.example` is tracked; no `.env`, no `ngrok.yml`,
      no authtoken anywhere in history.
- `[ ]` `git log -p | findstr /i "client_secret\|AUTH_SECRET\|postgres://"` — no real values in history.
- `[ ]` `NEXTAUTH_URL` unset in every environment (host-generality relies on `trustHost: true`).
- `[ ]` `AUTH_SECRET` / `NEXTAUTH_SECRET` set in the deploy platform only.

### Auth and access control
- `[ ]` Signed out: `/checkout`, `/account/*`, `/admin/*` redirect to `/login?callbackUrl=…`.
- `[ ]` `/accounting`-style lookalike paths are NOT swept up by the `/account` prefix.
- `[ ]` `/admin` refuses a signed-in non-admin (server-side `requireAdmin`, not a hidden link).
- `[ ]` A deactivated user (`isActive = false`) is refused by `getCurrentUser()`.
- `[ ]` No guest checkout: `Order.userId` is NOT NULL, so an unauthenticated POST cannot create one.

### IDOR
- `[ ]` Change an order id in the URL (`/account/orders`, `/order-success?order=…`) as user B →
      not user A's order. `where: { userId: user.id }` must hold.
- `[ ]` Directly POST to `cancelOrder` with someone else's order id → refused.
- `[ ]` A per-user coupon claimed by another account is rejected by `validateCoupon`.

### Money and stock
- `[ ]` Tamper with a cart line price in localStorage / the request body → server recomputes from
      Postgres (`computeTotals`), client totals are ignored.
- `[ ]` Negative or fractional quantities rejected by the zod schema.
- `[ ]` Order more units than exist in stock → rejected (atomic decrement, `stockQty >= qty`).
- `[ ]` Two concurrent buyers of the last unit: exactly one succeeds, no oversell.
- `[ ]` Double-submitting checkout with the same `idempotencyKey` creates one order.
- `[ ]` Cancel restores stock and the coupon in the same transaction.

### Rate limiting
- `[ ]` 6th `placeOrder` inside 60s is refused (5/min per user).
- `[ ]` Coupon apply and login are limited — blocked on gap §0 until implemented.

### Redirects and input
- `[ ]` `/login?callbackUrl=https://evil.com`, `//evil.com`, `/\evil.com` all fall back to `/`.
- `[ ]` `callbackUrl` with a control character is rejected.
- `[ ]` Coupon code and address fields are schema-validated; no SQL injection (Prisma parameterised).

### Logging and PII
- `[ ]` No emails, addresses, phone numbers, tokens or card data in server logs.

### Tunnel hygiene
- `[ ]` ngrok stopped after testing (the endpoint is a public door to the machine).
- `[ ]` Tunnel origin removed from the Google console; only the production domain remains.
- `[ ]` No destructive migration or seed ran while the tunnel was open.

## 4. Production deploy prep

- `[ ]` Real domain registered as an Authorized JavaScript origin **and** redirect URI
      (`https://<domain>/api/auth/callback/google`).
- `[ ]` Managed Postgres for `DATABASE_URL`; `prisma migrate deploy` (not `migrate dev`).
- `[ ]` `allowedDevOrigins` in `next.config.js` is dev-only and irrelevant in the build.
- `[ ]` Real brand imagery copied into `public/brand/` with explicit `width`/`height` on `next/image`.
- `[ ]` HTTPS enforced; `trustHost: true` is safe behind a proxy that sets host correctly.
