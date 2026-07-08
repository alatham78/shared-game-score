---
name: verify
description: Build, launch, and drive the Scorecast app (API dev server + Vite + Playwright) to verify changes end-to-end.
---

# Verifying Scorecast locally

Two processes, no cloud dependencies (file store + polling fallback):

```bash
# 1. API (port 7071, data in api/.data/)
cd api && npm install && node dev-server.js &

# 2. Frontend (port 5173, proxies /api → 7071)
cd app && npm install && npx vite --port 5173 --strictPort &
```

Auth is faked locally: the dev server injects a `local-dev-user` principal
when no `x-ms-client-principal` header is present, and the frontend falls
back to a fake user when `/.auth/me` is unreachable (dev builds only).

## Driving it

- Phone flow: `/` → New game → add players (min 2) → optional target →
  Start game → enter per-player scores → Submit round.
- TV flow: open `/display` in a second context — it auto-follows the most
  recently updated *active* game and refreshes via 4s polling (Web PubSub
  is not configured locally, so `/api/negotiate` returns `url: null`).

Playwright: use `chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })`
in the remote environment — the npm-pinned browser build is not installed.

## Gotchas

- Display reorder/tween animations run ~0.9s; wait for them to settle
  before screenshotting or asserting scores (`.board-score` text).
- Leader-change celebration only fires when the round count increases AND
  the leader set changes (class `celebrating` on the row, confetti canvas).
- Unit tests: `cd api && npm test` (game logic + controllers, file store
  in a temp dir). These are CI's job, not verification.
