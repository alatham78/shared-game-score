# 🏆 Scorecast — shared game scoreboard

Keep score of multi-round tabletop games (Flip 7, Mexican Train, Hearts, …)
on your phone while everyone watches the live scoreboard on a TV or iPad.

- **Phone = score entry.** Create a game, add players, submit scores round
  by round, undo mistakes, set an optional winning score.
- **TV / iPad = display.** Sign in with the same account, open the
  scoreboard, and it auto-follows your active game. Rows re-sort with
  smooth animations after every round, confetti flies when the lead
  changes, and a winner banner takes over when someone clinches it.
- **Both win directions.** Highest-wins (Flip 7 races up to 200) and
  lowest-wins (Mexican Train / Hearts count penalty points). When a target
  score is set, the board shows how many points each player still needs.

## Architecture

Everything runs on Azure free/serverless tiers — roughly **$0/month** at
game-night scale.

```
phone (entry)  ──► Azure Static Web Apps (Free)
TV (display)         ├─ React frontend (app/)
                     ├─ built-in auth: GitHub / Microsoft sign-in
                     └─ managed Azure Functions API (api/)
                            ├─ Cosmos DB serverless   ← games & rounds
                            └─ Web PubSub (Free_F1)   ← pushes round updates
                                                        to displays instantly
                                                        (displays also poll as
                                                        a fallback)
```

| Piece | Service | Tier / cost |
| --- | --- | --- |
| Hosting + auth + API | Azure Static Web Apps | Free |
| Data | Cosmos DB (serverless) | ~pennies per month |
| Real-time updates | Azure Web PubSub | Free (20 connections, 20k msg/day) |

## Repository layout

```
app/    React frontend (Vite) — entry UI, animated display, login
api/    Azure Functions (Node 20) — game CRUD, rounds, Web PubSub negotiate
infra/  Bicep template for all Azure resources
.github/workflows/  CI: API tests + Static Web Apps deploy
```

## Local development

No Azure account needed — data goes to a local JSON file and displays fall
back to polling:

```bash
# terminal 1 — API on :7071
cd api && npm install && npm run dev

# terminal 2 — frontend on :5173 (proxies /api)
cd app && npm install && npm run dev
```

Open <http://localhost:5173>. Auth is faked locally (`local-dev-user`), so
the app is fully usable offline. Run API unit tests with `cd api && npm test`.

## Deploy to Azure

1. **Provision** (one time):

   ```bash
   az group create -n scorecast-rg -l eastus2
   az deployment group create -g scorecast-rg -f infra/main.bicep
   ```

2. **Wire up GitHub Actions**: get the deployment token and save it as the
   `AZURE_STATIC_WEB_APPS_API_TOKEN` repository secret:

   ```bash
   az staticwebapp secrets list -n <staticWebAppName from deployment output> \
     --query properties.apiKey -o tsv
   ```

3. **Push to `main`** — the workflow tests the API and deploys the app and
   API to the Static Web App.

4. **Sign in** at the deployed URL with GitHub or Microsoft (both are
   built into Static Web Apps Free — no identity configuration needed).
   Google or other providers require the Standard tier (~$9/mo) with a
   custom OIDC provider.

## Using it

1. On your phone: sign in → **New game** → name it, add players, pick
   highest- or lowest-wins, optionally set the winning score / limit.
2. On the TV or iPad: sign in with the **same account** → **Scoreboard
   display**. It finds your active game automatically.
3. Submit scores each round from your phone; the TV updates within a
   second (Web PubSub) or a few seconds (polling fallback). Undo the last
   round or adjust the target score any time from the entry screen.
4. When a player reaches the target, the entry screen offers **Finish
   game**, and the display celebrates the winner. Finished games stay in
   your history on the home screen.
