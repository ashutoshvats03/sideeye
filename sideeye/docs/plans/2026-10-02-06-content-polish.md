# Plan 06 — Content, Polish + Razorpay Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** About, contact, FAQ, policy pages, wishlist, 404; a11y/perf pass; `README-RAZORPAY.md` integration guide.

**Architecture:** Static-ish server pages (contact form → mailto/DB-lite or logged ticket); wishlist in localStorage for signed-in users; single polish pass with Lighthouse + keyboard checks.

**Tech Stack:** Same as Plan 01.

**Spec:** design spec §3, §10, §11, §13.

## Global Constraints

- JavaScript only. Semantic HTML, labels on all inputs, visible focus, keyboard-operable carousel/menus.
- 360px-first; `next/image` with sizes; no CLS; lazy below-fold.
- Razorpay is DOC ONLY in this plan — no keys, no packages, no live code.

## Review Focus

- Contact form validates and confirms without leaking whether an email is registered.
- Wishlist survives reload and never breaks for signed-out visitors (prompts login).
- 404 page is branded and links home/shop.
- Lighthouse mobile: Performance ≥ 85, Accessibility ≥ 95 on Home + Product.
- Razorpay doc names exact files/routes from Plans 01–05 that will change (no vague "integrate payment gateway").

---

### Task 1: Content pages + wishlist + 404

**Files:**
- Create: `sideeye/app/about/page.jsx`, `sideeye/app/contact/page.jsx`, `sideeye/app/faq/page.jsx`, `sideeye/app/policies/{shipping,returns,privacy,terms}/page.jsx`, `sideeye/app/wishlist/page.jsx`, `sideeye/app/not-found.jsx`

**Interfaces:**
- Consumes: brand voice (funky, Gen-Z), `ProductCard`.
- Produces: story + anti-tarnish explainer + mascot (about); validated form + Insta/WhatsApp links (contact); care/tarnish/COD/delivery Q&A (faq); COD + returns terms (policies); wishlist hearts wired from cards/product page; branded 404.

- [ ] **Step 1: Build all pages.**
- [ ] **Step 2: Verify** — every navbar/footer link resolves; forms validate + confirm; wishlist persists.
- [ ] **Step 3: Commit** — `git commit -m "feat: add content pages, wishlist and 404"`

### Task 2: Polish pass (a11y + perf)

**Files:**
- Modify: prior pages/components as needed.

- [ ] **Step 1: Run Lighthouse mobile on `/` and `/product/[slug]`; fix to Performance ≥ 85, Accessibility ≥ 95.**
- [ ] **Step 2: Keyboard-only walkthrough** (tab order, focus visible, carousel/menus operable, form errors announced).
- [ ] **Step 3: `bun run build` clean** (no errors, no oversized first-load JS on shop/product).
- [ ] **Step 4: Commit** — `git commit -m "chore: accessibility and performance polish"`

### Task 3: README-RAZORPAY.md guide

**Files:**
- Create: `sideeye/README-RAZORPAY.md`

**Interfaces:**
- Consumes: exact files from Plans 01–05 (`actions/checkout.js`, `app/api/*`, Order model `paymentMethod/paymentStatus`).
- Produces: doc with packages, env keys, order-creation diff points, webhook route + signature verify recipe, idempotency, prepaid status transitions, COD-vs-prepaid test checklist (incl. double-webhook test).

- [ ] **Step 1: Write the guide** (each step names the file + function to touch).
- [ ] **Step 2: Verify** — a fresh reader can list the touch-points without asking questions (self-review against repo tree).
- [ ] **Step 3: Commit** — `git commit -m "docs: add Razorpay integration guide"`
