# Plan 02 — Auth + Account Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Google login mandatory before checkout; account pages; admin role gate.

**Architecture:** Auth.js (NextAuth) Google provider, Prisma adapter tables optional — store app User on first login via sign-in callback; middleware guards `/checkout`, `/account/*`, `/admin/*`.

**Tech Stack:** Same as Plan 01 + `next-auth` (Auth.js v5) + Google OAuth.

**Spec:** design spec §2, §8, §9.

## Global Constraints

- JavaScript only. Google OAuth is the ONLY login method in v1.
- No guest checkout: `/checkout` redirects to login when signed out.
- Admin = `User.role === "ADMIN"`; first admin from `ADMIN_EMAIL` env (auto-promoted on login or via seed).
- `isActive=false` users cannot log in / are signed out.
- Never log tokens, emails in full, or PII.

## Review Focus

- Signed-out user hitting `/checkout` lands back on checkout after login (callback URL preserved).
- Non-admin hitting `/admin/*` gets 403/redirect, checked server-side (not just hidden links).
- Deactivated (`isActive=false`) user is blocked even with a valid Google session.
- Double-clicking Google sign-in creates exactly one User row.
- Order reads outside `/account` are rejected for non-owners (covered fully in Plan 04 tests).

---

### Task 1: Auth.js Google setup + User sync

**Files:**
- Create: `sideeye/lib/auth.js`, `sideeye/app/api/auth/[...nextauth]/route.js`, `sideeye/lib/guards.js`
- Modify: `sideeye/prisma/schema.prisma` (add `role`, `isActive` if missing — verify against Plan 01)

**Interfaces:**
- Consumes: Plan 01 Prisma User model.
- Produces: `auth()` session helper; `requireUser()` (throws/redirects when signed out); `requireAdmin()` (throws/redirects when not ADMIN); sign-in callback upserts User by email (sets `lastLoginAt`, blocks `isActive=false`).

- [ ] **Step 1: Install + configure provider** (`bun add next-auth`), env vars into `.env.example`.
- [ ] **Step 2: Verify sign-in creates/updates exactly one User**

Run: sign in twice with test Google account, inspect DB
Expected: one User row, `lastLoginAt` updated.

- [ ] **Step 3: Verify inactive user blocked** (set `isActive=false`, sign in → denied).
- [ ] **Step 4: Commit** — `git commit -m "feat: add Google auth with User sync and guards"`

### Task 2: Login page + route protection

**Files:**
- Create: `sideeye/app/login/page.jsx`, `sideeye/middleware.js`
- Modify: `sideeye/app/layout.jsx` (session provider + navbar auth state)

**Interfaces:**
- Consumes: Task 1 `auth()`, guards.
- Produces: `/login` with Google button + `callbackUrl` support; middleware redirects signed-out `/checkout|/account/*` → `/login?callbackUrl=...`, non-admin `/admin/*` → `/`.

- [ ] **Step 1: Build login page + middleware.**
- [ ] **Step 2: Verify flows manually** — signed-out `/checkout` → login → back to checkout; signed-in non-admin `/admin` → redirected.
- [ ] **Step 3: Commit** — `git commit -m "feat: add login page and route protection"`
