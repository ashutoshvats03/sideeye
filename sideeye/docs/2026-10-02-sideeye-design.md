# SideEye E-commerce — Design Spec (v1)
Date: 2026-10-02 | Status: approved in chat (all 5 sections)

## 1. Overview
SideEye — funky anti-tarnish jewellery, tagline "Worth the second look".
Audience: women 14–28. Aesthetic: red + white, bold Gen-Z sticker style.
Stack: Next.js App Router + JavaScript + Bun, Tailwind, Prisma + Postgres 16
(Docker `my-postgres`), Auth.js Google OAuth, COD in v1, Razorpay deferred
(see `README-RAZORPAY.md` later). Code root: `./sideeye/`.

## 2. Locked decisions
- JS (not TS) + Bun. No guest checkout — Google login mandatory (Order.user NOT NULL).
- Payments v1: COD only. Razorpay integration deferred; ship a step-by-step guide doc.
- Shipping: flat Rs.49, free above Rs.999 (single `SHIPPING` config constant, easy to change).
- Admin panel in v1 (products, orders, coupons, reviews, users).
- Money in integer paise everywhere. Server recomputes totals.

## 3. Site map
Public: `/` Home · `/shop` (filters: category + vibe chips, search, sort) · `/product/[slug]` ·
`/about` · `/contact` · `/faq` · `/track` (order tracking) · `/wishlist` ·
`/policies/shipping` · `/policies/returns` · `/policies/privacy` ·
`/policies/terms` · `/cart` · `/checkout` · `/order-success` ·
`/account/orders` · `/login`.
Admin (`role=admin`): `/admin` dashboard · products · orders · coupons ·
reviews · users.

## 4. Home page blocks (order)
Announcement bar → navbar (logo, shop, wishlist, account, cart) → hero
(mascot + tagline + CTAs) → **photo carousel** (auto-play + swipe: product +
lifestyle shots from brand assets) → bestsellers carousel → shop-by-category →
anti-tarnish promise strip → reviews → gallery → newsletter → footer.

## 5. Product page (`/product/[slug]`)
Gallery + badges → name, price + MRP strike-through, rating →
**vibe tags** (sticker badges, e.g. Baddie / Slay — see §7) →
variant/qty, Add to Cart + Buy Now, wishlist → accordions (Description,
Materials, Care, Shipping & COD) → pincode estimate (static text v1) →
reviews (approved only; buyers can submit) → "You may also like".

## 6. Cart + checkout + order flow
- `/cart`: qty edit, coupon input, summary, free-shipping progress bar.
- `/checkout` (login-required): contact prefilled, address form + phone
  validation, coupon section, payment radio = COD (+ disabled "UPI/cards
  coming soon"), "Complete the look" suggestions (add without losing form).
- Place order: validate input (zod), recompute totals server-side from DB,
  atomic stock decrement, create Order + OrderItems + reservation release.
- Statuses: `pending → confirmed → packed → shipped → delivered`, plus
  `cancelled`/`refunded` (cancel restores stock + coupon in same txn).
- `/order-success`: order number + tracking hint.

## 7. Data models (Prisma/Postgres)
User(id, name, email unique, phone, isActive, role customer|admin,
avatar, emailVerified, lastLoginAt) · Address(userFK, label, name, phone,
line1/2, city, state, pincode, isDefault) · Category(name, slug, image) ·
Product(name, slug, description, care, materials, pricePaise, mrpPaise,
stockQty, images[], categoryFK, **vibes[]** (multi-tag: Eye Special, Funky,
Queen, Slay, Baddie — sticker badges on product page + filter chips in shop
alongside category), tags, isActive, ratingAvg, ratingCount) ·
Category seeded with exactly: Necklace, Earring, Anklet, Ring, Bracelet,
Arm Bracelet (each with image for shop-by-category).
Coupon(code unique, type %|flat, value, minOrderPaise, maxDiscountPaise,
usageLimit, perUserLimit, startsAt, expiresAt, isActive) ·
UserCoupon(userFK, couponFK, useCount) [personal coupon assignment] ·
Order(number unique, userFK NOT NULL, status, paymentMethod COD|RAZORPAY,
paymentStatus, subtotal/discount/shipping/total paise, couponFK,
addressSnapshot JSON, timeline JSON) · OrderItem(orderFK, productFK,
name/price snapshot, qty) · Review(productFK, userFK, rating, text,
isApproved) · StockReservation(productFK, qty, expiresAt).

## 8. Admin
Dashboard (COD collected/pending, orders by status, low stock) · Products
CRUD + image upload (`public/uploads` v1) · Orders (guarded transitions) ·
Coupons CRUD + assign-to-user · Reviews approve/reject · Users + isActive
toggle. First admin seeded by env email.

## 9. Auth & security
Auth.js Google only. Middleware protects `/checkout`, `/account/*`,
`/admin/*` (role check server-side). Owner-only order reads (no IDOR).
Rate-limit coupon/place-order/login. Zod validation on all inputs.
Never log PII/tokens.

## 10. Design system
Red (primary, ~#E63946 sampled from assets) + white + near-black text.
Chunky rounded cards, bold display font, sticker badges, mascot accents.
Mobile-first 360px, next/image lazy with width/height (no CLS).

## 11. Razorpay (deferred)
Do NOT integrate in v1. Ship `README-RAZORPAY.md` with: packages, env
keys, order-creation diff points, webhook route + signature verify,
idempotency keys, status transitions for prepaid, test checklist.

## 12. Build order
1 scaffold → 2 brand assets → 3 Prisma models + migrate → 4 auth →
5 shop + product → 6 cart/checkout/COD → 7 admin → 8 policies/FAQ/track →
9 polish → 10 Razorpay doc + tests.

## 13. Tests (per ecom guardrails)
Price calc, coupon edge cases, double-submit order, last-item concurrency
(documented), unauthorized order access, COD cancel restores stock.
