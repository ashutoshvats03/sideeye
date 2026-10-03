# Git info — SideEye

Last verified 2026-10-03, working tree clean, currently on `ngrok-branchh`.

Remote: `origin` = `https://github.com/ashutoshvats03/sideeye.git` (public repo, default branch `ngrok-branchh`).

## Branches

| Branch | HEAD | What it is |
| --- | --- | --- |
| `main` | `390a090` | Baseline: the design spec + the six plan docs. No app code. |
| `build/sideeye-v1` | `2da066a` | Plans 01–04 complete (foundation, Google auth, shop/product/reviews, cart + COD checkout). Pre-admin snapshot. |
| `ngrok-branchh` **(current)** | `953ab4f` | `build/sideeye-v1` + 12 commits. **The shipping branch** — Plan 05 code-complete, owner phone pass pending. |

## How the branches relate

```
main (390a090)
  └── build/sideeye-v1 (2da066a)
        └── ngrok-branchh (953ab4f)   +12 commits, 0 behind
```

`ngrok-branchh` is strictly ahead of `build/sideeye-v1` — 12 commits ahead, 0 behind. `main` has never
been merged into either; it only holds the spec and plans.

## The 12 commits on `ngrok-branchh` that `build/sideeye-v1` does not have

| Commit | What it does |
| --- | --- |
| `59e6bfb` | `fix(auth)`: require and document `AUTH_URL` so Google OAuth works behind a tunnel/proxy |
| `22651de` | `docs`: ngrok tunnel runbook + pre-production user/security test checklist |
| `4965731` | `fix(cart,ui)`: empty the bag after a successful order; kill the 54px mobile sideways scroll |
| `02b4d43` | `docs`: record the owner's production release suggestions |
| `a99d304` | `docs`: correct the Address-model note; add the localStorage pre-release audit |
| `d914803` | `docs`: record branch topology and remote state |
| `e1a75fb` | `docs`: write Plan 05 Task 3 and settle the plan's open decisions |
| `d957c98` | `docs`: add context.md (compressed project context for cold starts) |
| `d2b5668` | Plan 05 Task 1: admin dashboard + product CRUD (`lib/storage.js` seam, image uploads) |
| `f3505a5` | Plan 05 Task 2: admin orders/coupons/reviews/users (`lib/order-status.js` state machine) |
| `dfeb045` | Plan 05 Task 3: customer account area (profile + DOB, addresses, order detail) |
| `953ab4f` | Order-detail items link to their product pages with thumbnails |

DB note: `20261003180000_user_dob` (`User.dateOfBirth`, nullable) applied to local Postgres via manual
SQL + `migrate resolve --applied`. Tunnel note: ngrok is down; `AUTH_URL=http://localhost:3000`, server on :3000.

## Refreshing this file

The HEADs above go stale. Re-check with:

```
git branch -vv --all
git log --oneline --graph --all -15
git rev-list --count build/sideeye-v1..ngrok-branchh
git remote -v
```

Run `history-scan.ps1` before every push — the repo is public.
