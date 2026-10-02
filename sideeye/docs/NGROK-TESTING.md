# ngrok tunnel runbook (testing only)

Branch: `ngrok-branchh`. This branch is the one that will eventually be pushed to production,
**after** the user-test and security-test passes in [`RELEASE-CHECKLIST.md`](./RELEASE-CHECKLIST.md).

A tunnel publishes your laptop to the open internet. Everything below assumes you close it
when you are done.

---

## 1. Run the app

Production-like build (recommended — this is what actually ships):

```bash
cd sideeye
bun run build
bun run start          # serves http://localhost:3000
```

Dev server instead: `bun run dev`.

> **Dev mode over a tunnel needs one extra step.** Next.js 16 blocks cross-origin access to dev
> assets (`/_next/*`, HMR websocket), so a page loaded from `https://<tunnel-host>` renders as dead
> server HTML — buttons dead, cart spinner forever. `next.config.js` currently allows only the LAN IP
> (`allowedDevOrigins: ["192.168.1.15"]`). Add the tunnel host there, or just use the build above
> (`allowedDevOrigins` is dev-only, so a production build is unaffected).

## 2. Start the tunnel

```bash
ngrok http 3000
```

Note the `https://<something>.ngrok-free.app` URL it prints. That is your public origin.

Free plan gotchas:

- **The URL changes every time ngrok restarts.** Each new URL needs a fresh Google console entry.
  To avoid re-registering every time, reserve a static domain in the ngrok dashboard and pin it:
  `ngrok http 3000 --url https://<your-domain>`. (Verified on ngrok 3.39.9 — older v3 builds used
  `--domain`, so check `ngrok http --help` if `--url` is rejected.)
- **A browser interstitial ("You are looking at a website through ngrok") appears once per endpoint**
  on free accounts. Click through it. Sending an `ngrok-skip-browser-warning` header is a workaround
  for scripts, but ngrok does not allow adding that header via Traffic Policy on free plans.
- Your authtoken lives in your user profile via `ngrok config add-authtoken "<token>"` — keep it out
  of this repo. If you create an `ngrok.yml` in the project, do not commit it.

## 3. Register the tunnel origin in Google Cloud Console

OAuth client → Authorized JavaScript origins:

```
https://<tunnel-host>
```

OAuth client → Authorized redirect URIs:

```
https://<tunnel-host>/api/auth/callback/google
```

Keep `http://localhost:3000/api/auth/callback/google` registered too — that one is needed for local dev.

**Do not register `http://192.168.x.x/...`.** Google rejects private-IP redirect URIs with
`Error 400: device_id and device_name are required for private IP`. That is a Google policy, not an app
bug — LAN-IP login cannot be fixed from the app or the console. If you need a LAN test, use
`adb reverse tcp:3000 tcp:3000` and browse `http://localhost:3000` on the phone.

## 4. Nothing to configure in `.env`

`NEXTAUTH_URL` stays **unset**. `lib/auth.config.js` sets `trustHost: true`, so Auth.js derives the
callback host from the incoming request — localhost, the tunnel host, and the production domain all
work without edits. Pinning `NEXTAUTH_URL` to one host breaks the other two.

## 5. Test from your phone

Open `https://<tunnel-host>` on the phone, then walk [`RELEASE-CHECKLIST.md`](./RELEASE-CHECKLIST.md)
§ "User test pass".

## 6. Shut down

- Stop ngrok (Ctrl+C) — the endpoint is public until you do.
- Stop the Next.js server.
- `docker stop my-postgres` if you do not need it locally.
- Remove the tunnel origin from the Google console once testing is done, so the production client
  only carries the origins that ship.
