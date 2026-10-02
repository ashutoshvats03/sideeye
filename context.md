# SideEye — Project Context

> Generated 2026-10-03. This file is the working context for anyone (human or agent) picking this repo up cold. It compresses conversation that is not recoverable from the code itself.
> For branch mechanics see `git-info.md`. For release steps see `sideeye/docs/RELEASE-CHECKLIST.md`.

---

## 1. What this is

**SideEye** — a funky anti-tarnish jewellery brand. Tagline *"Worth the second look."*
Target audience: women 14–28. Brand aesthetic: red + white, Gen-Z.

A Next.js e-commerce app. v1 is **COD (Cash on Delivery) only** — Razorpay is deliberately deferred to a written guide, not code.

---

## 2. Locked stack

| Layer | Choice |
|---|---|
| Framework | Next.js **App Router 16.3.8** |
| Language | **JavaScript** (no TypeScript) |
| Runtime / PM | **Bun** |
| Styling | Tailwind CSS ^3.4.0 |
| ORM | Prisma 7.10.0 |
| Database | Postgres 16 in Docker, container `my-postgres`, DB `sideeye` |
| Auth | **Google OAuth only** — no passwords, no guest checkout |
| Payments | COD only in v1 |

**Categories** (fixed set): Necklace, Earring, Anklet, Ring, Bracelet, Arm Bracelet
**Vibes** (fixed set, multi-tag on products): Eye Special, Funky, Queen, Slay, Baddie

**Money rule:** integer paise only, never floats. The server recomputes every total from Postgres. Client-sent prices are never trusted.
**Shipping:** flat Rs.49, free at/above Rs.999.

---

## 3. Current state

Plans 01–04 are **built and shipped to the branch**: foundation + theme + Prisma + pricing · Google auth + route guards · home/shop/product/reviews · cart + coupons + COD checkout. Content, footer and demo seed are in.

Plan 05 (admin panel + customer account area) is **fully specified in writing, zero lines of code written**. Plan 06 (content remainder, polish, Razorpay doc) likewise.

**The only thing blocking app work is the phrase "start Plan 05".**

---

## 4. Branch topology

Three branches, nothing squashed, all pushed 2026-10-03:

| Branch | HEAD | What it holds |
|---|---|---|
| `ngrok-branchh` | `e1a75fb` | **Shipping branch.** Plans 01–04 + ngrok fixes + docs. Default branch on GitHub. |
| `main` | `390a090` | Design spec + 6 plan docs only. No app code. |
| `build/sideeye-v1` | `2da066a` | Plans 01–04 checkpoint. |

`ngrok-branchh` is **7 commits** ahead of `build/sideeye-v1`, 0 behind.

Commits `ngrok-branchh` adds beyond `build/sideeye-v1`:
`59e6bfb` AUTH_URL fix · `22651de` ngrok runbook + release checklist · `4965731` bag-clear + mobile overflow fix · `02b4d43` owner's suggestions · `a99d304` Address-note correction + localStorage audit · `d914803` git-info.md · `e1a75fb` Plan 05 Task 3 written

---

## 5. Decisions that are NOT visible in the code

These came from owner conversation. Reading the code will not tell you why.

- **Host pin is `AUTH_URL`, not `NEXTAUTH_URL`.** Required for OAuth to work behind the ngrok tunnel. `trustHost: true` does not fix it, and `experimental.trustHostHeader` is rejected outright by 16.3.8's schema. It must equal the address-bar host exactly — no trailing slash, no path — and is read at boot, so restart the server after editing.
- **Cart clearing after an order is client-side.** localStorage is the cart's source of truth; the cookie is only a mirror.
- **Dashboard must never aggregate money across a user's orders.** Explicit owner instruction: *"i don't want users to know how much they spend."* A single order's own total stays on that order's receipt. No lifetime-spend, no cross-order sum, no dashboard total. This is a Global Constraint, not a preference.
- **Deploy: VPS now, Cloudflare R2 later**, migrating at roughly 1000 active users. Hence `lib/storage.js` is the single storage seam. When R2 lands, add its host to `images.remotePatterns` in `next.config.js`. If the app ever runs multi-instance, `lib/rate-limit.js` needs a Redis equivalent behind the same two-function API.
- **`Address` needs no migration.** The model has existed since Plan 01 with no UI attached. The single new column in Plan 05 Task 3 is `User.dateOfBirth DateTime?`.
- **DB-affecting changes require owner approval before applying.** The DOB migration is the one pending.
- **No order-status transition map exists yet.** `Order.status` is a bare string; its seven legal values live only in a comment and nothing enforces a move. Plan 05 Task 2 builds `lib/order-status.js` first.
- **GitHub repo layout:** the repo root is `C:\Users\ashutosh vats\opencode`, so GitHub shows the app under a `sideeye/` subfolder. Owner chose "push as-is" — accepted, not an oversight.
- **Commit author is `opencode <opencode@local>`.** Owner chose to leave it, knowing it's permanent and public.

---

## 6. Known live gaps

| Gap | Where | Why it matters |
|---|---|---|
| Reviews can never be approved | `POST /api/reviews` stores everything `isApproved: false`; only approved ones render | A shopper's review is invisible forever. Closes with Plan 05 Task 2's reviews screen. |
| Coupon apply is not rate limited | `app/api/coupon/route.js:15` — the comment *falsely claims* Plan 04 added it | `checkRateLimit` is only called in `actions/checkout.js` as `place-order:${user.id}`. Coupon codes are brute-forceable. |
| Login is not rate limited | — | Same class of problem. |
| Rate limiter is in-memory | `lib/rate-limit.js`, 5 per 60s | Fine at one instance. Breaks across instances. |
| Cart cookie has no `Secure` flag | `Path=/; Max-Age=604800; SameSite=Lax` | Add `Secure` on the production HTTPS domain. |
| Google avatar won't render through `next/image` | `next.config.js` has no `images.remotePatterns` | Confirm the real host from a live session's `picture` URL, add the pattern, or fall back to a plain `<img>` at fixed dimensions. |
| Pincode autofill + "use my current location" | RELEASE-CHECKLIST §5.4 / §5.5 | Blocked on owner decisions: pincode data source (bundled JSON vs third-party API) and geocoder (Nominatim vs Google Places). Also needs a `district` column, hence a migration. |

---

## 7. Environment quirks

These cost real time to rediscover. Save yourself the trouble.

- **`next start` serves the build loaded at boot.** A rebuild does nothing until the old node process is killed and the server restarted. Only a `.ps1` using `Get-NetTCPConnection` + `Stop-Process -Force` works in this shell (`kill3000.ps1` does exactly this).
- **`migrate dev` is blocked** by drift in this repo. New columns must be applied as **manual SQL + `migrate resolve --applied`**.
- **Generated Prisma client is gitignored.** Regenerate and restart after any schema change.
- **Google rejects private-IP redirect URIs**, so LAN-IP login is impossible. Use `adb reverse tcp:3000 tcp:3000` or the ngrok tunnel.
- **Free ngrok URLs change on every restart.** Re-register the new origin in the Google console and update `AUTH_URL`.
- **The tunnel is public.** Never run a destructive migration while it is open.
- **Shell quirks in this environment:** double quotes get stripped, so use script files rather than `bun -e`. Multi-line commits need `git commit -F <unquoted 8.3 path>` (e.g. `C:\Users\ASHUTO~2\...`). `find`, `head`, `tasklist /fi` and PowerShell-oneline piping are all unreliable — write a `.ps1` and invoke it.
- **`gh` is not installed.** Use the GitHub REST API with the credential GCM already stores (`git credential fill`), never printing or writing the token.

---

## 8. Local state at time of writing

- Repo clean, nothing untracked, all three branches tracking their upstreams.
- `node_modules` (1.4 GB) and `.next` (488 MB) present and gitignored — kept for build speed, never pushed.
- Full-history bundle backup: `C:\Users\ashutosh vats\AppData\Local\Temp\opencode-backup-2026-10-03.bundle` (6.49 MB). **Move this off `%TEMP%`** — Windows may clear it.
- ngrok may still be running with the tunnel up; `ngrok.log` is locked by that process.
- Gates last known green: `bun test` 217 pass / 0 fail / 505 expects · `bun run lint` clean · `bun run build` clean (24 routes).

---

## 9. Pre-push safety routine

Because the repo is **public**, history is permanent — a leaked secret cannot be un-leaked.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File <TEMP>\opencode\history-scan.ps1
```

Sweeps every blob on every branch for ngrok tokens, `GOCSPX-` secrets, GitHub/AWS/Stripe keys, PEM keys, and non-empty `*_SECRET=`. **Expect `HISTORY_HITS=0`.** Run it before every future push. Do not delete these scan scripts.

---

## 10. What's waiting on the owner

1. **"start Plan 05"** — Task 1 first: `lib/storage.js`, `actions/admin-products.js`, `app/admin/page.jsx`, `app/admin/products/page.jsx`.
2. **DOB column approval** — `User.dateOfBirth DateTime?`, the one migration Task 3 needs. DB changes need explicit sign-off.
3. **§5.4 pincode data source** — bundled JSON or third-party API?
4. **§5.5 geocoder** — Nominatim or Google Places?
5. **Phone test passes** — RELEASE-CHECKLIST §2 (user) and §3 (security). The bag-clear fix cannot be verified without a real logged-in COD order.

**Execution order:** Plan 05 Task 1 → 2 → 3 → §5.4/§5.5 → §0 rate-limit gaps → Plan 06 remainder → phone pass → security pass.