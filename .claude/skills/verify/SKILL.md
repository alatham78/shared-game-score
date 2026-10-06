---
name: verify
description: Build, launch, and drive the Scorecast app (API dev server + Vite + Playwright) to verify changes end-to-end.
---

# Verifying Scorecast locally

Worker + D1 on :8787, Vite on :5173 (proxies `/api` → the Worker). Household
PIN is in `.dev.vars` (`PIN=7391`).

```bash
# 1. Worker (port 8787, local D1)
echo 'PIN=7391' > .dev.vars
npx wrangler dev --port 8787 --ip 127.0.0.1 &

# 2. Frontend (port 5173, proxies /api → 8787)
cd app && npm install && npx vite --port 5173 --strictPort &
```

Or drive the built SPA from the Worker itself after `npm run build --prefix app`
(open http://127.0.0.1:8787). Sign in with PIN `7391`.

## Driving it

- Phone flow: `/` → New game → add players (min 2) → optional target →
  Start game → enter per-player scores → Submit round.
- TV flow: open `/display` in a second context — it auto-follows the most
  recently updated *active* game and refreshes via 4s polling
  (`/api/negotiate` returns `url: null`).

Playwright: use `chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })`
in the remote environment — the npm-pinned browser build is not installed.

## Gotchas

- Display reorder/tween animations run ~0.9s; wait for them to settle
  before screenshotting or asserting scores (`.board-score` text).
- Leader-change celebration only fires when the round count increases AND
  the leader set changes (class `celebrating` on the row, confetti canvas).
- Unit tests: `npm test` from the repo root (`api` + `worker`). These are
  CI's job, not verification.
