# AGENTS.md

## Project
SideEye - funky anti-tarnish jewellery brand (Tagline: "Worth the second look")
Target audience: women ages 14-28

## Tech Stack (LOCKED by user decisions)
- Next.js (App Router) + JavaScript (not TypeScript)
- Bun as package manager/runtime
- Tailwind CSS
- Database: Postgres 16 via Docker (Prisma ORM)
- Payments: Razorpay + COD (Cash on Delivery)
- Image optimization (next/image)
- Project root: `./sideeye/` (all app code lives here)

## Global Rules
- Truthfulness: never invent APIs/paths; look up if unsure. Say "I don't know / not verified" if uncertain.
- Read before editing; smallest diff that solves the task. No drive-by refactors.
- After changes: typecheck + lint + relevant tests. Fix root causes.
- Money: store as integers in minor units (paise/cents). Never floats. Server recomputes totals.
- Secrets: env vars only. Never print/commit secrets.
- Be terse; code/commands/errors exact and complete.
- Use skills: verify-before-done always for bugs/features; ecom-guardrails for shop/payments/orders; agentic-ai-guardrails for LLM/agent code; ui-ux-pro-max for new UI.

## E-commerce Guardrails (Critical)
- Amounts as integer minor units + currency. Server validates totals from DB.
- Order state machine with valid transitions. Webhooks idempotent (verify signatures).
- Atomic stock decrement (qty >= n). Reserve stock with expiry at checkout.
- Authorization: owner-only access; role checks for admin. Prevent IDOR.
- Rate limit checkout/coupon/login. Schema validation on all inputs.
- Never log card data/tokens/full PII.

## Code Style
- Follow existing patterns and conventions in codebase
- JavaScript (no TS); JSDoc types on complex functions where helpful
- Accessibility: semantic HTML, labels, focus management, WCAG compliance
- Mobile-first responsive (360px minimum)
- Performance: lazy load images with width/height; avoid CLS

## Testing
- Price calculations, coupon edge cases, double-webhook handling, concurrent last-item purchase, unauthorized order access
- Component tests for critical UI flows
- E2E for checkout flow

## Git
- Conventional commits preferred
- Small, focused commits
- No secrets in commits

## Brand Assets (source of truth)
- Raw assets folder (NOT in repo): `C:\Users\ashutosh vats\OneDrive\Desktop\sideeye`
- Contains ~74 files: product photos (IMG-20260707-WA*.jpg), logo + mascot (IMG_2247.PNG, IMG_2253.PNG, IMG_2254.PNG, IMG_2265.PNG, IMG_2270.JPEG)
- Curated copies live in repo at: `sideeye/public/brand/` (logo, mascot, hero, product samples)
- Brand: red + white aesthetic, funky Gen-Z jewellery, audience women 14-28

## Local DB (Docker Postgres 16)
- Container: `my-postgres`, user `postgres`, db `postgres`, port `5432`, volume `pgdata`
- DATABASE_URL for Prisma: `postgresql://postgres:postgres@localhost:5432/postgres`
- Start cmd: `docker start my-postgres` (create cmd saved in user chat history)

## Decisions Log
- 2026-10-02: JS (not TS) + Bun, code under `./sideeye/`
- 2026-10-02: Razorpay + COD (no Stripe)
- 2026-10-02: Postgres-from-day-1 via Docker (no SQLite phase)
- 2026-10-02: Google login (OAuth) for v1 auth
- 2026-10-02: Admin panel required in v1 (products, orders, coupons)
- 2026-10-02: Shipping = flat Rs.49 + free above Rs.999 (config constant)
- 2026-10-02: Approach A monolith, BUT Razorpay deferred — COD only in v1 + `README-RAZORPAY.md` guide for later
- 2026-10-02: No guest checkout — Google login mandatory before placing order (Order.user FK NOT NULL)
- 2026-10-02: Execution = Native (implement in-session, fresh reviewer at end); bring Big Pickle at Plan 04 checkout — REMIND USER THEN
- 2026-10-02 (user suggestions): Home photo carousel; Product.vibes[] multi-tag (Eye Special, Funky, Queen, Slay, Baddie) shown as badges + shop filter chips; Category fixed set = Necklace, Earring, Anklet, Ring, Bracelet, Arm Bracelet

## Plans (spec → 6 phased plans)
- Spec: `sideeye/docs/2026-10-02-sideeye-design.md`
- `sideeye/docs/plans/2026-10-02-01-foundation.md` (scaffold, theme, Prisma, pricing)
- `sideeye/docs/plans/2026-10-02-02-auth-account.md` (Google auth, guards)
- `sideeye/docs/plans/2026-10-02-03-shop-product.md` (home, shop, product)
- `sideeye/docs/plans/2026-10-02-04-cart-checkout.md` (cart, COD checkout, orders)
- `sideeye/docs/plans/2026-10-02-05-admin.md` (admin panel)
- `sideeye/docs/plans/2026-10-02-06-content-polish.md` (content, polish, Razorpay guide)
