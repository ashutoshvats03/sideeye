# Git info — SideEye

Last verified 2026-10-03, working tree clean, currently on `ngrok-branchh`.

## Branches

| Branch | HEAD | What it is |
| --- | --- | --- |
| `main` | `390a090` | Baseline: the design spec + the six plan docs. No app code. |
| `build/sideeye-v1` | `2da066a` | Plans 01–04 complete (foundation, Google auth, shop/product/reviews, cart + COD checkout). Where the work stood before tunnel testing. |
| `ngrok-branchh` **(current)** | `a99d304` | `build/sideeye-v1` + 5 commits. **The shipping branch** — this is what eventually goes to production after the user and security test passes. |

## No remote

`git branch -a` lists no remotes and `git remote -v` prints nothing: there is **no `origin`**, so no
remote-tracking branches exist and nothing has ever left this machine. Every push is still ahead of
us — creating the remote is part of release prep, not something already done.

## How the branches relate

```
main (390a090)
  └── build/sideeye-v1 (2da066a)
        └── ngrok-branchh (a99d304)   +5 commits, 0 behind
```

`ngrok-branchh` is strictly ahead of `build/sideeye-v1` — 5 commits ahead, 0 behind. `main` has never
been merged into either; it only holds the spec and plans.

## The 5 commits on `ngrok-branchh` that `build/sideeye-v1` does not have

| Commit | What it does |
| --- | --- |
| `59e6bfb` | `fix(auth)`: require and document `AUTH_URL` so Google OAuth works behind a tunnel/proxy (Next.js builds the absolute request URL from its bind address, not the `Host` header, so the wrong host leaked into `redirect_uri`) |
| `22651de` | `docs`: ngrok tunnel runbook + pre-production user/security test checklist |
| `4965731` | `fix(cart,ui)`: empty the bag after a successful order; kill the 54px mobile sideways scroll |
| `02b4d43` | `docs`: record the owner's production release suggestions |
| `a99d304` | `docs`: correct the Address-model note; add the localStorage pre-release audit |

## Refreshing this file

The HEADs above go stale. Re-check with:

```
git branch -vv --all
git log --oneline --graph --all -15
git rev-list --count build/sideeye-v1..ngrok-branchh
git remote -v
```
