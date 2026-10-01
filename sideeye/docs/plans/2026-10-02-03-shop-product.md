# Plan 03 — Shop + Product Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Home (hero + photo carousel + bestsellers + categories), shop with category/vibe filters + search/sort, product detail with vibe badges + reviews.

**Architecture:** Server components reading Prisma directly; `next/image` everywhere with sizes; client islands only for carousel, filters, gallery, qty/wishlist.

**Tech Stack:** Same as Plan 01.

**Spec:** design spec §3, §4, §5, §10.

## Global Constraints

- JavaScript only. All images via `next/image` with width/height (no CLS). Mobile-first 360px.
- Only `isActive` products listed; only `isApproved` reviews shown.
- Prices via `formatPaise` (Plan 01); never floats in UI math.
- Vibe labels exactly: Eye Special, Funky, Queen, Slay, Baddie. Categories exactly the seeded six.

## Review Focus

- Inactive products never appear in shop/search/related rails (direct URL returns 404).
- Unapproved reviews are invisible, including their count in the rating summary.
- Empty shop (no matches) shows a designed empty state, not a blank page.
- Carousel is swipeable on 360px and does not shift layout while loading.
- Related rail never shows the current product or out-of-stock items.

---

### Task 1: Home page

**Files:**
- Create: `sideeye/app/page.jsx`, `sideeye/components/PhotoCarousel.jsx`, `sideeye/components/ProductCard.jsx`, `sideeye/components/HomeSections.jsx` (as needed, one responsibility each)

**Interfaces:**
- Consumes: `public/brand/*`, Prisma Product/Category, `formatPaise`.
- Produces: sections in spec order: hero → PhotoCarousel → bestsellers → shop-by-category → promise strip → reviews → gallery → newsletter → footer (footer/navbar in `layout.jsx` if not present).

- [ ] **Step 1: Build sections with real DB queries** (bestsellers by `ratingCount`, categories with images).
- [ ] **Step 2: Verify** — `bun dev` home at 360px + desktop: no CLS, no 404 images, carousel auto-plays + swipes.
- [ ] **Step 3: Commit** — `git commit -m "feat: build home page with photo carousel"`

### Task 2: Shop page (filters/search/sort)

**Files:**
- Create: `sideeye/app/shop/page.jsx` (server query + client filter islands)

**Interfaces:**
- Consumes: Prisma Product/Category, `ProductCard`.
- Produces: category chips + vibe chips + search + sort (newest, price ↑↓, rating); URL query params reflect state (shareable links).

- [ ] **Step 1: Build with URL-param state.**
- [ ] **Step 2: Verify** — filter by Arm Bracelet + Baddie narrows correctly; nonsense query shows empty state; inactive product URL 404s.
- [ ] **Step 3: Commit** — `git commit -m "feat: build shop page with category and vibe filters"`

### Task 3: Product detail + reviews

**Files:**
- Create: `sideeye/app/product/[slug]/page.jsx`, `sideeye/components/Gallery.jsx`, `sideeye/components/Reviews.jsx`, `sideeye/app/api/reviews/route.js` (POST, zod-validated, buyer+login required, `isApproved=false` default)

**Interfaces:**
- Consumes: Prisma Product/Review, `formatPaise`, `requireUser` (Plan 02).
- Produces: gallery, price/MRP, vibe sticker badges, qty + Add to Cart (localStorage cart, Plan 04 format: `[{slug, qty}]`) + Buy Now, accordions, static pincode estimate, approved reviews + summary, related rail (same category, in stock, excludes self).

- [ ] **Step 1: Build page + review POST route.**
- [ ] **Step 2: Verify** — review submits as unapproved (invisible until approved); related rail rules hold; Buy Now routes toward checkout.
- [ ] **Step 3: Commit** — `git commit -m "feat: build product page with reviews"`
