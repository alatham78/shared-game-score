# 🏆 Scorecast — shared game scoreboard

Keep score of multi-round tabletop games (Flip 7, Mexican Train, Hearts, …)
on your phone while everyone watches the live scoreboard on a TV or iPad.

- **Phone = score entry.** Create a game, add players, submit scores round
  by round, undo mistakes, set an optional winning score.
- **TV / iPad = display.** Enter the same household PIN, open the
  scoreboard, and it auto-follows your active game. Rows re-sort with
  smooth animations after every round, confetti flies when the lead
  changes, and a winner banner takes over when someone clinches it.
- **Both win directions.** Highest-wins (Flip 7 races up to 200) and
  lowest-wins (Mexican Train / Hearts count penalty points). When a target
  score is set, the board shows how many points each player still needs
  (highest-wins) or how many remain before the limit (lowest-wins).

## Architecture

Runs on Cloudflare’s free tier at game-night scale.

```
phone (entry)  ──► Cloudflare Worker
TV (display)         ├─ React frontend (app/, static assets)
                     ├─ household PIN session
                     └─ /api/* on the same Worker
                            └─ D1 (SQLite)  ← games & rounds
                               displays poll every few seconds
```

| Piece | Service | Tier / cost |
| --- | --- | --- |
| Hosting + API | Cloudflare Worker + static assets | Free |
| Data | D1 | Free |
| Auth | Shared household PIN | — |

## Repository layout

```
app/       React frontend (Vite) — entry UI, animated display, PIN login
worker/    Cloudflare Worker — game CRUD, rounds, PIN session
api/       Scoring logic + Node unit tests (shared with the Worker)
.github/workflows/  CI: tests + Wrangler deploy
```

## Local development

```bash
# one-time
echo 'PIN=7391' > .dev.vars
cd app && npm install && cd ..
npm install

# terminal 1 — API + D1 on :8787
npx wrangler dev --port 8787

# terminal 2 — frontend on :5173 (proxies /api)
cd app && npm run dev
```

Open <http://localhost:5173>. Sign in with PIN `7391` (or whatever you put in `.dev.vars`).
Run tests with `npm test` from the repo root (`api` + `worker`).

## Deploy to Cloudflare

D1 database `scorecast` is already created on the Cloudflare account
(`565e322c-e8c1-4b12-92e2-ecd0661b9525`). One-time setup:

```bash
npx wrangler login
cd app && npm install && npm run build && cd ..
npx wrangler deploy
echo '<your-pin>' | npx wrangler secret put PIN
```

GitHub Actions deploys on push to `main` when repository secrets
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are set. Put the
household PIN in the Worker with `wrangler secret put PIN` once; CI does
not overwrite it.

## Using it

1. On your phone: open the site → enter the household PIN → **New game**.
2. On the TV or iPad: same PIN → **Scoreboard display**.
3. Submit scores each round from your phone; the TV refreshes every few seconds.
4. When a player reaches the target, **Finish game** — the display celebrates.
