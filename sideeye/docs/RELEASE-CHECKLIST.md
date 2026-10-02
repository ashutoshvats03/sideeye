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
- `[ ]` `AUTH_URL` set to the exact origin being served in each environment — and **not** left
      pointing at a dead tunnel host. Never leave `NEXTAUTH_URL` set to a different host than
      `AUTH_URL`'s intent; a mismatch is what produces `redirect_uri_mismatch`.
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
- `[ ]` `AUTH_URL` set on the deploy platform to `https://<your-domain>` (no path, no trailing
      slash). Without it Auth.js advertises the server's bind address as the OAuth callback origin
      and Google fails the login with `redirect_uri_mismatch` — this is exactly what went wrong on
      the ngrok tunnel (see [`NGROK-TESTING.md`](./NGROK-TESTING.md) §4).

## 5. Production release suggestions (owner's list)

Logged during the tunnel testing pass so nothing has to be re-investigated at release time.
Items 5.1 and 5.2 were fixed in this pass; 5.3–5.5 are parked feature work, not started.

### 5.1 `[x]` Clear the bag after a successful order

`clearCart()` was only ever called from the CartClient "Clear bag" button, so after placing an
order the bag still held the lines that had just been ordered (badge count included).
Fixed with `components/ClearCartAfterOrder.jsx` — a client island rendered by the success page
only. The cart's source of truth is localStorage, so only the browser can clear it; resetting
the cookie server-side would leave the badge showing the ordered items.

Phone check: place an order, then open `/cart` — it must be empty and the badge 0.

### 5.2 `[x]` Mobile: whole app wider than the screen

Measured at a 360px viewport (345px content width after the scrollbar) on the live tunnel:
- signed-out pages (`/`, `/shop`, `/cart`, `/faq`, `/about`, `/contact`, `/track`, `/login`):
  zero overflow, `scrollWidth == viewport` on every one;
- signed-in header: the nav row measured 279px inside a 345px row, so the document scrolled to
  399px — 54px of sideways scroll on **every** page while signed in. Cause: the single
  non-wrapping flex row in `components/site-header.jsx` (Shop + Bag + Account `max-w-[10rem]` +
  Log out) is wider than a phone.

Fixed by shrinking the header on small screens only: nav padding `px-2 sm:px-3`, the Account
name capped at `max-w-[6rem]` below `sm` (`sm:max-w-[10rem]`) with `min-w-0` so `truncate` works
inside the flex row, and the `SideEye` wordmark hidden below `sm` (the logo mark stays). Re-measured
on the production build after the fix: signed-in `scrollWidth 345 == viewport 345`, zero
offending elements — was 399px.

Phone check: no sideways scroll on any page while signed in and signed out; the header still
reads well at 360px and 390px.

### 5.3 `[ ]` Saved addresses per user (new `Address` model)

Each user can save as many addresses as they like; checkout offers them as suggestions.

Shape to build (needs a migration — DB change, so owner approval before applying):
`Address { id, userId FK (cascade), label ("Home", "College", …), fullName, phone, line1,
line2?, landmark?, city, district?, state, pincode, isDefault, createdAt, updatedAt }`, with at
most one `isDefault` per user. `Order.addressSnapshot` already exists, so a placed order keeps
its own copy and later edits to an address can never rewrite order history.

Open decisions: does checkout *replace* the form fields when a saved address is picked, or show a
compact "deliver to" picker with a "change" link; should a used address auto-save, or is there an
explicit "save this address" checkbox.

### 5.4 `[ ]` Pincode → state / district autofill

Typing a 6-digit pincode fills city, district and state instead of making the shopper type them.

Open decision — where the pincode data comes from:
- **bundled dataset in the repo** (recommended): a JSON of ~6-digit PIN code → city/district/state,
  committed alongside the app. No network call, no API key, works offline, but it is only as
  fresh as the last refresh and adds repo weight;
- **third-party API** (postalpincode.in, Data.gov.in): always current, but checkout then depends
  on a remote service — latency, rate limits, an API key to protect, and a hard failure mode if
  it is down at order time.

Open decision — autocomplete UI: a dropdown of matching areas while typing vs filling on blur
after 6 digits. Pincode validation stays server-side; the lookup is a convenience, never the
source of truth for what gets stored.

### 5.5 `[ ]` "Use my current location" on the address form

Browser Geolocation (`navigator.geolocation.getCurrentPosition`) fills the form for a shopper who
does not want to type their address.

Requires: HTTPS (already satisfied on the tunnel and on any real domain) and an explicit
permission prompt, so it must be a button the shopper taps — never an automatic request on page
load. Coordinates are transient: resolve them to a pincode/city with a geocoder (OpenStreetMap
Nominatim, or Google Places) and store only the resulting address fields.

Open decisions: which geocoder (Nominatim's free tier requires a real User-Agent and is rate
limited; Google Places needs a key and bills per request); whether the resolved address is
offered as a suggestion to review rather than filled in silently; how much accuracy to demand
before auto-filling (a city-level match is not enough for delivery).

