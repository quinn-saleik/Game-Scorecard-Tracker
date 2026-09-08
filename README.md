# Scorecard

A family card-game score tracker: pick a game, pick players, keep score, see stats. Built with React + Vite, synced live across devices with Firebase Firestore, deployed free on GitHub Pages. No login — anyone with the site link plays.

Beyond scorekeeping: achievement badges, a Hall of Fame, per-player/per-game stats, a big-screen TV mode built for phones, post-game recap with confetti + one-tap rematch, and free-text notes on any past game.

## Games in this build

| Game | Players | Notes |
|---|---|---|
| Oh Heck! | 3+ | Bidding trick-taking, see rules below |
| Flip7 | 2+ | Push-your-luck card game |
| Euchre — 2-player | exactly 2 | See rules below |
| Euchre — 3-player | exactly 3 | See rules below |
| Euchre — Traditional (2v2) | exactly 4 (2 teams) | See rules below, includes team shuffler |
| Euchre — 15-card | exactly 4 (2 teams) | Trump-suit + bid-winner entry, includes team shuffler |
| Euchre — Pick your partner | 3+ | Bidder calls a partner (or goes alone); trump calling with a once-per-game Hi-No/Lo-No |
| Royal Rum | 2+ | Counts down (lower score wins) |
| Catchphrase | 2+ (2 teams, any size) | |
| 31 | 2+ | |
| Golf | 2-6 | Counts down; negative hole scores supported (e.g. a hole-in-one at -4 or lower) |
| Secret Hitler | 5-10 | |
| Dutch Blitz | 2-4 | |
| Nertz | 2-6 | |
| Codenames | 4+ (2 teams, any size) | |
| Egyptian Ratscrew | 2+ | |
| Skip-Bo | 2+ | |
| Phase 10 | 2+ | Counts down |
| Other (custom) | 2+ | Make up any game — name, icon, scoring direction, optional target, bid tracking — save it once and it gets its own Home tile for everyone from then on |

Every game's Play screen has an entry into **TV mode** — a fullscreen, always-dark scoreboard meant to be propped up and read from across the room (or held up in portrait, which is what it's mainly tuned for). Rows fill the whole screen with no scrolling and auto-scale their text to however many players are in the game; past 5 players in landscape it splits into two columns.

### Oh Heck! rules as implemented
- Config at game start: starting card count (default 8), and a bid-rule toggle — **Traditional** (dealer can't bid the number that would make total bids exactly equal the cards dealt) or **Bang 'em** (no restriction, bids just labeled over/under/even).
- Round progression: down to 1 card, the 1-card round is played twice, then back up to the starting count, then the game ends (e.g. 5→4→3→2→1→1→2→3→4→5).
- Dealer rotates one seat per round in the order players were selected at setup; bidding goes in turn order starting left of the dealer, dealer bids last.
- Scoring: hit your bid exactly → bid + 10. Miss it → however many tricks you actually won, no bonus.
- Bids and tricks are written live to the shared game session as they're entered, so every device watching (including TV mode) sees the same in-progress state, not just the device doing the scoring.
- Like Flip7, the final round's win doesn't lock in until you tap "Confirm winner & finish" — there's an undo-last-round option first.

### Euchre rules as implemented
- **2-player**: pick 2 players (order sets who deals first), configurable win threshold (default 50). Every hand splits a fixed 12 points/tricks between the two — enter only the caller's raw points taken (0-12) and the app computes both deltas automatically (`caller: points >= 7 ? points : -7`, `other: 12 - points`). Dealer alternates automatically each hand.
- **3-player**: pick 3 players, configurable starting score (default 15, counts down). Each hand, every player gets an outcome: 1-5 points taken (subtracted from their score) or **SET** (+5, moves them further from the goal). First to 0 or below wins.
- **Traditional (2v2)**: tap players to assign Team 1 / Team 2 (2 each, or use the 🎲 Shuffle teams button), configurable win threshold (default 10). Each hand you enter each team's points, added cumulatively to a shared team score. The winning team's individual players each get credited with a win in Stats, same as every other game.
- **15-card**: exactly 4 players, 2 teams (assign or shuffle, same as Traditional). Each hand: call the trump suit, enter who won the bid and for how much, then just the bid-winning team's tricks won — the app derives the rest.
- **Pick your partner**: 3 or more players, no fixed teams. Each hand: the bidder calls trump (a suit, or a once-per-game Hi-No/Lo-No — no trump, high or low card wins each trick) and their bid amount, then how many tricks they actually took (score = tricks if they made their bid, negative the bid if they didn't), then who their partner was (or that they went alone, credited with the bidder's own score), then one shared entry for everyone else's trick count.

## Achievements, Hall of Fame, and stats

- **Achievement badges** (22 total, shown on each player's page, locked/unlocked): career milestones (first win, win streaks, games played, games tried, win rate) plus game-specific ones built from real round-by-round data — Went Alone / Lone Wolf / Solo Streak (Pick Your Partner), Perfect Game / Zero Hero / Nil Streak (Oh Heck!), Untouchable / Survivor / Double Trouble / Comeback Kid (3-player Euchre), Big Flip / Ice Cold (Flip7), Hole in One (Golf), Iron Man (3+ different games in one day).
- **Hall of Fame** (`/hall-of-fame`): all-time records across the whole roster — most games played, most wins, longest win streak ever, Euchre Royalty (combined wins across every Euchre variant), Flip7 High Score (best single round, not final total), Table Regular (most distinct opponents played with), and Rivalry (the most-frequent opponent pair, with each one's head-to-head win tally).
- **Per-player stats** (`/players/:id`): overview numbers, current/longest win streak, then a game-by-game breakdown (games played, win %, average score, best score — direction-aware, so a 3-player Euchre "best" is the lowest finish) for every game that player has history in.
- **Stats page** (`/stats`): roster-wide play counts and favorite games; `/hall-of-fame` and each player's own page cover the record-keeping above.
- **Game notes**: any past game's scorecard (`/history/:sessionId`) has a free-text notes field — a casual, unstructured "anything worth remembering about this one?" box, not part of any stat.
- **Post-game recap**: confetti, final standings, and a one-tap "Rematch — same players" button that starts a fresh session with the same roster and settings.

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

- **`players`** collection — one doc per player (`{ name, firstName, lastName, active, color, avatar, photo }`). Added manually from the Players tab (first + last name required; exact-duplicate names are blocked). No seeded roster — the app starts with an empty player list. "Removing" a player just flips `active: false` so past game stats still resolve their name. Each player can be given a color, an emoji avatar, and/or a photo (photo takes over from the emoji wherever they're shown).
- **`gameSessions`** collection — one doc per game played, shared by every game type: `{ gameType, players, config, rounds, totals, notes, status: 'in_progress' | 'completed', winnerIds }`. Every round/hand is written to Firestore as it's scored (not just at the end), so nothing is lost if someone closes the tab mid-game. `notes` is the free-text field from the game's history page.
- **`customGames`** collection — one doc per "Other" game someone's made up (`{ name, icon, scoreDirection, targetScore, bidding }`). Saving one gives it a permanent Home tile; sessions still play through the generic `other` gameType, so editing a custom game's rules later never changes a game already in progress or already in the history books.

## Resuming in-progress games

`src/components/OngoingGames.jsx` shows any game(s) still `in_progress`: on the Home screen it shows every ongoing game across all types (so nothing gets lost if you wander off to Stats mid-game); on each game's Setup screen it's scoped to just that game type, so picking a game you're already mid-way through offers to resume it. Each entry shows a live players/scores summary and has **Resume** (jumps back into the Play screen) and **Quit & delete** (hard-deletes the session — used for a game that was abandoned or started by mistake) buttons.

## Display settings

The ⚙️ menu in the top bar (every screen) has a light/dark theme toggle and a text-size preset (Normal/Large/Extra large) — both apply app-wide, including TV mode.

## Access

No login for players — anyone with the site link can use it, matching a trusted ~10-person family audience. The silent anonymous Firebase auth (see setup step 2.3) is purely a backend security measure, invisible to users.

## Adding the next game

Each game gets its own folder under `src/pages/games/<game>/` with a Setup screen (who's playing + config) and a Play screen (turn-by-turn scoring), following the pattern in `src/pages/games/flip7/`. Wire new routes into `src/App.jsx` and add a tile to `src/pages/Home.jsx`. The `gameSessions` and `stats` data layers are already generic — no changes needed there for a new game, as long as it stores `players`, `totals`, and `winnerIds` the same way.
