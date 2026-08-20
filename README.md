# Scorecard

A family card-game score tracker: pick a game, pick players, keep score, see stats. Built with React + Vite, synced live across devices with Firebase Firestore, deployed free on GitHub Pages.

Live games in this build: **Flip7**, **Oh Heck!**, and **Euchre** (2-player / 3-player / traditional). Euchre's 15-card and pick-your-partner variants, plus **Other**, are on the roadmap — see `ScorecardAppAgents.docx` in the project for the full spec.

### Oh Heck! rules as implemented
- Config at game start: starting card count (default 8), and a bid-rule toggle — **Traditional** (dealer can't bid the number that would make total bids exactly equal the cards dealt) or **Bang 'em** (no restriction, bids just labeled over/under/even).
- Round progression: down to 1 card, the 1-card round is played twice, then back up to the starting count, then the game ends (e.g. 5→4→3→2→1→1→2→3→4→5).
- Dealer rotates one seat per round in the order players were selected at setup; bidding goes in turn order starting left of the dealer, dealer bids last.
- Scoring: hit your bid exactly → bid + 10. Miss it → however many tricks you actually won, no bonus.
- Like Flip7, the final round's win doesn't lock in until you tap "Confirm winner & finish" — there's an undo-last-round option first.

### Euchre rules as implemented
- **2-player**: pick 2 players (order sets who deals first), configurable win threshold (default 50). Each hand you enter both players' points, added cumulatively; dealer alternates automatically each hand (shown as a badge). Same confirm-before-locking pattern as Flip7.
- **3-player**: pick 3 players, configurable starting score (default 15). Each hand, every player gets an outcome: 1-5 points (subtracted from their score) or **SET** (+5, moves them further from the goal). First to 0 or below wins.
- **Traditional (2v2)**: tap players to assign Team 1 / Team 2 (2 each), configurable win threshold (default 10). Each hand you enter each team's points, added cumulatively to a shared team score. The winning team's individual players each get credited with a win in Stats, same as every other game.

## One-time setup (~15 minutes)

### 1. Create the GitHub repo

1. Create a new repo on GitHub (public or private — private works fine with Pages on a paid plan; public is free either way).
2. Push this code:
   ```
   git init
   git add .
   git commit -m "Initial scorecard app"
   git branch -M main
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

### 2. Create a Firebase project (free)

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → **Add project** → name it (e.g. `family-scorecard`) → skip Google Analytics (not needed).
2. In the project, click **Build → Firestore Database → Create database** → start in **production mode** → pick any region close to you.
3. Click **Build → Authentication → Get started** → enable the **Anonymous** sign-in provider. (This lets the app quietly sign everyone in behind the scenes — no login screen — just so Firestore's security rules can require *some* authenticated session.)
4. Go to **Project settings** (gear icon) → **Your apps** → click the `</>` web icon → register an app (any nickname) → copy the `firebaseConfig` values shown.
5. In **Firestore Database → Rules**, paste the contents of `firestore.rules` from this repo and click **Publish**.

### 3. Wire the Firebase config into the app

You need the config in two places:

**For local development:** copy `.env.example` to `.env` and fill in the values from step 2.4.

**For the deployed site:** GitHub Actions builds the site, so the values need to be GitHub repo secrets, not just in your local `.env` (which is gitignored and never gets pushed). In your GitHub repo: **Settings → Secrets and variables → Actions → New repository secret**, and add each of these six secrets with the matching value from your Firebase config:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

### 4. Turn on GitHub Pages

**Settings → Pages → Build and deployment → Source: GitHub Actions.**

That's it — the workflow in `.github/workflows/deploy.yml` already builds and deploys on every push to `main`. Push (or re-run the workflow from the **Actions** tab) and your site will be live at `https://<your-username>.github.io/<repo-name>/`.

## Local development

```
npm install
npm run dev
```

Requires `.env` to be filled in (step 3 above) for the app to talk to Firestore.

## How data is structured

- **`players`** collection — one doc per player (`{ name, active, isDefault }`). The 13 default players are seeded automatically on first load of the Players tab. "Removing" a player just flips `active: false` so past game stats still resolve their name.
- **`gameSessions`** collection — one doc per game played, shared by every game type: `{ gameType, players, config, rounds, totals, status: 'in_progress' | 'completed', winnerIds }`. Every round/hand is written to Firestore as it's scored (not just at the end), so nothing is lost if someone closes the tab mid-game.

## Resuming in-progress games

`src/components/OngoingGames.jsx` shows any game(s) still `in_progress`: on the Home screen it shows every ongoing game across all types (so nothing gets lost if you wander off to Stats mid-game); on each game's Setup screen it's scoped to just that game type, so picking a game you're already mid-way through offers to resume it. Each entry shows a live players/scores summary and has **Resume** (jumps back into the Play screen) and **Quit & delete** (hard-deletes the session — used for a game that was abandoned or started by mistake) buttons.

## Access

No login for players — anyone with the site link can use it, matching a trusted ~10-person family audience. The silent anonymous Firebase auth (see setup step 2.3) is purely a backend security measure, invisible to users.

## Adding the next game

Each game gets its own folder under `src/pages/games/<game>/` with a Setup screen (who's playing + config) and a Play screen (turn-by-turn scoring), following the pattern in `src/pages/games/flip7/`. Wire new routes into `src/App.jsx` and add a tile to `src/pages/Home.jsx`. The `gameSessions` and `stats` data layers are already generic — no changes needed there for a new game, as long as it stores `players`, `totals`, and `winnerIds` the same way.
