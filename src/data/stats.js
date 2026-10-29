import { getRoundDelta } from "./rounds";

// Client-side stats aggregation. At ~10 players and a family's worth of
// game nights, recomputing on every load is simpler (and cheaper) than
// maintaining rollup documents — revisit if the sessions collection ever
// gets large.

export const GAME_LABELS = {
  flip7: "Flip7",
  "oh-heck": "Oh Heck!",
  "euchre-2p": "Euchre (2-player)",
  "euchre-3p": "Euchre (3-player)",
  "euchre-traditional": "Euchre (traditional)",
  "euchre-15card": "Euchre (15-card)",
  "euchre-partner": "Euchre (pick your partner)",
  catchphrase: "Catchphrase",
  "thirty-one": "31",
  "royal-rum": "Royal Rum",
  other: "Other",
  hearts: "Hearts",
  cribbage: "Cribbage",
  canasta: "Canasta",
  pinochle: "Pinochle",
  golf: "Golf",
  spades: "Spades",
  "gin-rummy": "Gin Rummy",
  "secret-hitler": "Secret Hitler",
  "dutch-blitz": "Dutch Blitz",
  nertz: "Nertz",
  codenames: "Codenames",
  "egyptian-ratscrew": "Egyptian Ratscrew",
  "skip-bo": "Skip-Bo",
  "phase-10": "Phase 10",
};

// Euchre 3-player and Royal Rum count DOWN (lower is better); Golf and
// Phase 10 are always down; everything else — including "31" lives,
// where more is safer — counts up. Shared with OngoingGames (ranking
// in-progress standings). Every custom "Other" game shares the literal
// gameType "other", so it can never be listed here by name — its
// direction is looked up separately, per game, in computePlayerDetail's
// "best score" logic below.
export const LOWER_IS_BETTER = new Set(["euchre-3p", "royal-rum", "golf", "phase-10"]);

function slug(s) {
  return (s || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

// "Same calendar day" badges (Iron Man, Clean Sweep) group by the day the
// game was actually played on the couch — Central time — not the UTC day
// the Firestore timestamp happens to fall on. A game that wraps past
// midnight UTC (i.e. anything after ~6-7pm Central) would otherwise get
// silently bucketed into the next day. Intl.DateTimeFormat with an
// explicit IANA zone (rather than a fixed UTC-6 offset) self-adjusts
// across the CST/CDT boundary automatically. This one is intentionally
// pinned to Central (unlike data/format.js's device-local formatLastPlayed)
// since it's about which couch the game was actually played on, not about
// how a given viewer's phone is set.
const CENTRAL_DAY_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Chicago",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
function centralDayKey(date) {
  // en-CA formats numeric dates as YYYY-MM-DD directly.
  return CENTRAL_DAY_FORMATTER.format(date);
}

// "Other" sessions carry a user-typed custom game name (config.customName).
// Group/label by that name (case-insensitively) instead of the flat
// "other" bucket, so "Poker" and "Yahtzee" show up as distinct games in
// stats rather than being lumped together.
function gameGroupKey(session) {
  if (session.gameType === "other") {
    return `other:${slug(session.config?.customName)}`;
  }
  return session.gameType;
}

export function gameGroupLabel(session) {
  if (session.gameType === "other") {
    return session.config?.customName || "Other";
  }
  return GAME_LABELS[session.gameType] || session.gameType;
}

export function computePlayerStats(players, completedSessions) {
  const byId = new Map(
    players.map((p) => [
      p.id,
      {
        playerId: p.id,
        name: p.name,
        firstName: p.firstName || null,
        lastName: p.lastName || null,
        color: p.color || null,
        avatar: p.avatar || null,
        photo: p.photo || null,
        active: p.active,
        gamesPlayed: 0,
        wins: 0,
        expectedWins: 0, // what luck alone would have won — see parPct below
        gameCounts: {}, // groupKey -> {label, count}
        lastPlayedAt: null,
      },
    ])
  );

  for (const session of completedSessions) {
    const groupKey = gameGroupKey(session);
    const groupLabel = gameGroupLabel(session);
    for (const player of session.players || []) {
      const entry = byId.get(player.id);
      if (!entry) continue; // player removed since; skip
      entry.gamesPlayed += 1;
      const g = entry.gameCounts[groupKey] || { label: groupLabel, count: 0 };
      g.count += 1;
      entry.gameCounts[groupKey] = g;
      if ((session.winnerIds || []).includes(player.id)) {
        entry.wins += 1;
      }
      // "Par" for this game: the share of the table that wins. A 2-player
      // game is 1/2, an 8-player game 1/8, a 4-player team game with a
      // 2-person winning team 2/4. Summed over a player's games it's the
      // wins pure luck would give them, which is what raw win % can't show
      // (someone who mostly plays 2-player looks better than someone who
      // mostly plays 8-player at identical skill).
      const seats = (session.players || []).length;
      if (seats > 0) entry.expectedWins += (session.winnerIds || []).length / seats;
      const completedAt = session.completedAt?.toDate?.() || null;
      if (completedAt && (!entry.lastPlayedAt || completedAt > entry.lastPlayedAt)) {
        entry.lastPlayedAt = completedAt;
      }
    }
  }

  return Array.from(byId.values())
    .map((e) => {
      const favoriteEntry = Object.values(e.gameCounts).sort((a, b) => b.count - a.count)[0];
      return {
        playerId: e.playerId,
        name: e.name,
        firstName: e.firstName,
        lastName: e.lastName,
        color: e.color,
        avatar: e.avatar,
        photo: e.photo,
        active: e.active,
        gamesPlayed: e.gamesPlayed,
        wins: e.wins,
        winPct: e.gamesPlayed ? Math.round((e.wins / e.gamesPlayed) * 100) : 0,
        // Win % luck alone would give them, given the table sizes they play.
        parPct: e.gamesPlayed ? Math.round((e.expectedWins / e.gamesPlayed) * 100) : 0,
        // Actual wins / expected wins: 1.0 = exactly par, 2.0 = twice as
        // often as luck. Null with nothing to compare against.
        winIndex: e.expectedWins > 0 ? Math.round((e.wins / e.expectedWins) * 100) / 100 : null,
        favoriteGame: favoriteEntry ? favoriteEntry.label : "—",
        lastPlayedAt: e.lastPlayedAt,
      };
    })
    .sort((a, b) => b.gamesPlayed - a.gamesPlayed);
}

// Fewer games than this and a single lucky/unlucky night swings the ratio, so
// "vs par" stays blank rather than overclaim.
export const MIN_GAMES_FOR_RATING = 5;

// Full detail for one player's page: summary numbers (reusing the same
// definitions as computePlayerStats), game-by-game history newest first,
// a per-game-type breakdown (games/wins/win%/avg/best score — see
// gamesByType below), and streak info. Win streaks only — no loss-streak
// tracking, just a "last game won" signal per the family-app framing
// (nobody needs their losing streak highlighted).
export function computePlayerDetail(playerId, players, completedSessions, customGames = []) {
  const player = players.find((p) => p.id === playerId);
  if (!player) return null;

  const [summary] = computePlayerStats([player], completedSessions);

  const playerSessions = completedSessions
    .filter((s) => (s.players || []).some((p) => p.id === playerId))
    .map((s) => {
      const totals = s.totals || {};
      return {
        sessionId: s.id,
        gameType: s.gameType,
        gameLabel: gameGroupLabel(s),
        completedAt: s.completedAt?.toDate?.() || null,
        won: (s.winnerIds || []).includes(playerId),
        score: typeof totals[playerId] === "number" ? totals[playerId] : null,
      };
    })
    .sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0));

  // Chronological (oldest-first) order for streak math.
  const chronological = [...playerSessions].reverse();
  let longestStreak = 0;
  let running = 0;
  for (const g of chronological) {
    running = g.won ? running + 1 : 0;
    if (running > longestStreak) longestStreak = running;
  }
  let currentStreak = 0;
  for (const g of playerSessions) {
    if (!g.won) break;
    currentStreak += 1;
  }
  const lastWin = playerSessions.find((g) => g.won) || null;

  // Per-game breakdown — "Flip7: average score, highest score, win %"
  // and so on for every game this player has a completed history in.
  // Reuses the same score already computed above (session.totals at
  // completion) rather than re-deriving anything from round data, so it
  // works uniformly for every game type. "Best" respects each game's own
  // direction (LOWER_IS_BETTER) so a 3-player Euchre "best" is their
  // lowest finish, not their highest.
  //
  // Every custom "Other" game shares the literal gameType "other", so
  // LOWER_IS_BETTER can't tell them apart by type. Instead, look up each
  // one's CURRENT direction from the live customGames doc (matched by
  // slugified name, same id scheme customGames.js uses) rather than any
  // one session's frozen config snapshot. That's a deliberate difference
  // from OtherPlay.jsx (which always reads a session's own frozen
  // config, so gameplay never shifts under someone mid-session): this is
  // just a stats display, so if a custom game's direction is edited
  // later, "best score" re-reads as low-or-high consistently across every
  // game under that name, past and future, with no per-session data to
  // migrate.
  const customGameDirectionById = new Map(customGames.map((g) => [g.id, g.config?.scoreDirection]));
  const byGame = new Map(); // gameLabel -> { label, gameType, played, wins, scores }
  for (const g of playerSessions) {
    const entry = byGame.get(g.gameLabel) || { label: g.gameLabel, gameType: g.gameType, played: 0, wins: 0, scores: [] };
    entry.played += 1;
    if (g.won) entry.wins += 1;
    if (typeof g.score === "number") entry.scores.push(g.score);
    byGame.set(g.gameLabel, entry);
  }
  const gamesByType = Array.from(byGame.values())
    .map((e) => {
      const lowerIsBetter =
        e.gameType === "other"
          ? customGameDirectionById.get(slug(e.label)) === "down"
          : LOWER_IS_BETTER.has(e.gameType);
      const avgScore = e.scores.length ? e.scores.reduce((a, b) => a + b, 0) / e.scores.length : null;
      const bestScore = e.scores.length ? (lowerIsBetter ? Math.min(...e.scores) : Math.max(...e.scores)) : null;
      return {
        label: e.label,
        gamesPlayed: e.played,
        wins: e.wins,
        winPct: e.played ? Math.round((e.wins / e.played) * 100) : 0,
        avgScore: avgScore === null ? null : Math.round(avgScore * 10) / 10,
        bestScore,
        bestScoreLabel: lowerIsBetter ? "Best (lowest)" : "Best score",
      };
    })
    .sort((a, b) => b.gamesPlayed - a.gamesPlayed);

  return {
    ...summary,
    history: playerSessions,
    gamesByType,
    currentStreak,
    longestStreak,
    lastWin: lastWin ? { gameLabel: lastWin.gameLabel, completedAt: lastWin.completedAt } : null,
  };
}

export function computeGameStats(completedSessions) {
  const counts = {};
  for (const session of completedSessions) {
    const key = gameGroupKey(session);
    const label = gameGroupLabel(session);
    // `groupKey` (not `gameType`) is what actually distinguishes two custom
    // "Other" games — every custom game shares the literal gameType
    // "other", so a caller that keys a list by gameType (e.g. React's
    // `key` prop) would collide two different custom games into one row.
    counts[key] = counts[key] || { groupKey: key, gameType: session.gameType, label, count: 0 };
    counts[key].count += 1;
  }
  return Object.values(counts).sort((a, b) => b.count - a.count);
}

// Achievement badges. The original eight are simple all-time milestones
// off the aggregate detail object (gamesPlayed, wins, streaks, history).
// The rest dig into specific games' own round records — Oh Heck's
// per-round hitBid/tricksWon, Pick Your Partner's bidder/partner/tricks
// fields, 3-player Euchre's set/points results — since those can't be
// derived from the generic totals-only history computePlayerDetail
// already returns. `earned(detail, mySessions)` gets both: `mySessions`
// is every completed session (the full session doc, including
// rounds/config, not just the summarized history) this player took part
// in, filtered once in computeAchievements so each badge doesn't have to
// repeat that scan itself.
//
// "Double Trouble" is worth flagging: 3-player Euchre's round record only
// says whether a given player's own result that hand was "set" or
// "points" — there's no separate field for who caused it. So even
// requiring the SAME round, this reads as "both other players got set on
// the same hand of a game you were part of", not a claim that this
// player personally set them both.

// ---- helpers for the newer badges -------------------------------------
const sessionMs = (s) => s.completedAt?.toDate?.()?.getTime?.() ?? 0;
const chronological = (sessions) => [...sessions].sort((a, b) => sessionMs(a) - sessionMs(b));
const didWin = (s, id) => (s.winnerIds || []).includes(id);
const sessionDayKey = (s) => {
  const date = s.completedAt?.toDate?.();
  return date ? centralDayKey(date) : null;
};

function sessionLowerIsBetter(s) {
  if (s.gameType === "other") return s.config?.scoreDirection === "down";
  return LOWER_IS_BETTER.has(s.gameType);
}

// Running totals after the first `n` hands, using the same per-game reader
// the round-history screens use.
function totalsAfter(s, n) {
  const out = Object.fromEntries((s.players || []).map((p) => [p.id, 0]));
  (s.rounds || []).slice(0, n).forEach((r) => {
    for (const p of s.players || []) out[p.id] += getRoundDelta(s.gameType, r, p.id, s);
  });
  return out;
}

// Games where the board decides the winner and everyone is on their own, so
// "last place at the halfway point" means something. (Team games, Phase 10 /
// Royal Rum — finish-the-list games — and lives-based 31 are left out.)
const BOARD_GAMES = new Set(["flip7", "oh-heck", "euchre-3p", "euchre-partner", "golf", "hearts", "dutch-blitz", "nertz", "other"]);

function wasLastAtHalf(s, id) {
  if (!BOARD_GAMES.has(s.gameType) || s.config?.winnerOnly) return false;
  const players = s.players || [];
  const n = (s.rounds || []).length;
  if (players.length < 3 || n < 4) return false;
  const t = totalsAfter(s, Math.floor(n / 2));
  const low = sessionLowerIsBetter(s);
  return players.every((p) => p.id === id || (low ? t[id] > t[p.id] : t[id] < t[p.id]));
}

// Won a game that included the career-wins leader (6+ wins at the time, and
// at least twice your own), and that leader didn't win it.
function slewGiant(playerId, allSessions) {
  const wins = new Map();
  for (const s of chronological(allSessions)) {
    const ids = (s.players || []).map((p) => p.id);
    if (ids.includes(playerId) && didWin(s, playerId)) {
      const mine = wins.get(playerId) || 0;
      let top = 0;
      for (const w of wins.values()) top = Math.max(top, w);
      if (top >= 6 && mine * 2 < top && ids.some((q) => q !== playerId && (wins.get(q) || 0) === top && !didWin(s, q))) {
        return true;
      }
    }
    for (const w of s.winnerIds || []) wins.set(w, (wins.get(w) || 0) + 1);
  }
  return false;
}

// Won the game that ended someone else's streak of 3+ wins.
function brokeStreak(playerId, allSessions) {
  const streak = new Map();
  for (const s of chronological(allSessions)) {
    const ids = (s.players || []).map((p) => p.id);
    const iWon = ids.includes(playerId) && didWin(s, playerId);
    for (const q of ids) {
      if (didWin(s, q)) {
        streak.set(q, (streak.get(q) || 0) + 1);
      } else {
        if (iWon && q !== playerId && (streak.get(q) || 0) >= 3) return true;
        streak.set(q, 0);
      }
    }
  }
  return false;
}

// Beat the same player in 5 straight games you both played. Games where you
// both won (teams) or neither did don't count for or against.
function hasNemesis(playerId, mySessions) {
  const run = new Map();
  for (const s of chronological(mySessions)) {
    const iWon = didWin(s, playerId);
    for (const o of s.players || []) {
      if (o.id === playerId) continue;
      const theyWon = didWin(s, o.id);
      if (iWon && !theyWon) {
        run.set(o.id, (run.get(o.id) || 0) + 1);
        if (run.get(o.id) >= 5) return true;
      } else if (theyWon && !iWon) {
        run.set(o.id, 0);
      }
    }
  }
  return false;
}

function maxWinsInOneGame(playerId, mySessions) {
  const counts = new Map();
  for (const s of mySessions) {
    if (!didWin(s, playerId)) continue;
    const k = gameGroupKey(s);
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  return Math.max(0, ...counts.values());
}

function maxGamesInOneDay(mySessions) {
  const byDay = new Map();
  for (const s of mySessions) {
    const k = sessionDayKey(s);
    if (k) byDay.set(k, (byDay.get(k) || 0) + 1);
  }
  return Math.max(0, ...byDay.values());
}

function maxDaysInOneMonth(mySessions) {
  const byMonth = new Map();
  for (const s of mySessions) {
    const k = sessionDayKey(s);
    if (!k) continue;
    const set = byMonth.get(k.slice(0, 7)) || new Set();
    set.add(k);
    byMonth.set(k.slice(0, 7), set);
  }
  return Math.max(0, ...Array.from(byMonth.values(), (set) => set.size));
}

// Phase 10: cleared every phase in exactly ten hands — never missed one.
function phaseMaster(playerId, mySessions) {
  return mySessions.some((s) => {
    if (s.gameType !== "phase-10") return false;
    const rounds = s.rounds || [];
    return rounds.length >= 10 && rounds.every((r) => r.completed?.[playerId]);
  });
}

const DEALER_GAMES = new Set(["oh-heck", "phase-10", "royal-rum"]);
function longestStreakOf(sessions, playerId) {
  let best = 0;
  let run = 0;
  for (const s of chronological(sessions)) {
    run = didWin(s, playerId) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

const isSkyJo = (s) => s.gameType === "other" && slug(s.config?.customName).replace(/-/g, "") === "skyjo";

const BADGE_DEFS = [
  { id: "first-win", emoji: "🎉", label: "First Win", description: "Won a game", earned: (d) => d.wins >= 1 },
  { id: "hot-streak", emoji: "🔥", label: "Hot Streak", description: "Won 3 games in a row", earned: (d) => d.longestStreak >= 3 },
  { id: "on-fire", emoji: "🔥🔥", label: "On Fire", description: "Won 5 games in a row", earned: (d) => d.longestStreak >= 5 },
  { id: "regular", emoji: "🎖️", label: "Regular", description: "Played 10 games", earned: (d) => d.gamesPlayed >= 10 },
  { id: "veteran", emoji: "🏅", label: "Veteran", description: "Played 25 games", earned: (d) => d.gamesPlayed >= 25 },
  { id: "legend", emoji: "👑", label: "Legend", description: "Played 50 games", earned: (d) => d.gamesPlayed >= 50 },
  {
    id: "well-rounded",
    emoji: "🎲",
    label: "Well Rounded",
    description: "Played 5 different games",
    earned: (d) => new Set(d.history.map((h) => h.gameLabel)).size >= 5,
  },
  {
    id: "went-alone",
    emoji: "🐺",
    label: "Went Alone",
    description: "Went alone in Pick Your Partner and made the bid",
    earned: (d, sessions) =>
      sessions.some(
        (s) =>
          s.gameType === "euchre-partner" &&
          (s.rounds || []).some(
            (r) => r.bidderId === d.playerId && r.partnerId === "none" && (r.tricks || 0) >= (r.bid || 0)
          )
      ),
  },
  {
    id: "perfect-game",
    emoji: "💯",
    label: "Perfect Game",
    description: "Hit your bid (+10 bonus) every round of an Oh Heck! game",
    earned: (d, sessions) =>
      sessions.some((s) => {
        if (s.gameType !== "oh-heck") return false;
        const rounds = s.rounds || [];
        return rounds.length > 0 && rounds.every((r) => r.results?.[d.playerId]?.hitBid === true);
      }),
  },
  {
    id: "zero-hero",
    emoji: "🥚",
    label: "Zero Hero",
    description: "Took zero tricks every round of an entire Oh Heck! game",
    earned: (d, sessions) =>
      sessions.some((s) => {
        if (s.gameType !== "oh-heck") return false;
        const rounds = s.rounds || [];
        return rounds.length > 0 && rounds.every((r) => (r.results?.[d.playerId]?.tricksWon || 0) === 0);
      }),
  },
  {
    id: "untouchable",
    emoji: "🛡️",
    label: "Untouchable",
    description: "Finished a 3-player Euchre game without ever being set",
    earned: (d, sessions) =>
      sessions.some((s) => {
        if (s.gameType !== "euchre-3p") return false;
        const rounds = s.rounds || [];
        return rounds.length > 0 && !rounds.some((r) => r.results?.[d.playerId]?.type === "set");
      }),
  },
  {
    id: "survivor",
    emoji: "🩹",
    label: "Survivor",
    description: "Finished a 3-player Euchre game with 25+ points",
    earned: (d, sessions) => sessions.some((s) => s.gameType === "euchre-3p" && (s.totals?.[d.playerId] || 0) >= 25),
  },
  {
    id: "double-trouble",
    emoji: "⚔️",
    label: "Double Trouble",
    description: "Both other players got set on the exact same round of a 3-player Euchre game",
    earned: (d, sessions) =>
      sessions.some((s) => {
        if (s.gameType !== "euchre-3p") return false;
        const others = (s.players || []).map((p) => p.id).filter((id) => id !== d.playerId);
        if (others.length < 2) return false;
        const rounds = s.rounds || [];
        return rounds.some((r) => others.every((oid) => r.results?.[oid]?.type === "set"));
      }),
  },
  {
    id: "comeback-kid",
    emoji: "📈",
    label: "Comeback Kid",
    description: "Climbed to 20+ points in 3-player Euchre and still won",
    earned: (d, sessions) =>
      sessions.some((s) => {
        if (s.gameType !== "euchre-3p" || !(s.winnerIds || []).includes(d.playerId)) return false;
        const start = s.config?.startingScore ?? 15;
        let runningTotal = start;
        let peak = start;
        for (const r of s.rounds || []) {
          runningTotal += r.deltas?.[d.playerId] || 0;
          if (runningTotal > peak) peak = runningTotal;
        }
        return peak >= 20;
      }),
  },
  {
    id: "shutout",
    emoji: "🥊",
    label: "Shutout",
    description: "Won a Traditional (2v2) Euchre game without the other team ever scoring a point",
    earned: (d, sessions) =>
      sessions.some((s) => {
        if (s.gameType !== "euchre-traditional" || !(s.winnerIds || []).includes(d.playerId)) return false;
        const teamA = s.config?.teamA || [];
        const teamB = s.config?.teamB || [];
        const otherTeam = teamA.includes(d.playerId) ? teamB : teamA;
        return otherTeam.length > 0 && otherTeam.every((id) => (s.totals?.[id] || 0) === 0);
      }),
  },
  {
    id: "skunked",
    emoji: "💀",
    label: "Skunked",
    description: "Took all 12 points in a single 2-player Euchre hand — your opponent got zero",
    earned: (d, sessions) =>
      sessions.some(
        (s) =>
          s.gameType === "euchre-2p" &&
          (s.rounds || []).some((r) => (r.callerId === d.playerId ? r.callerPoints === 12 : r.callerPoints === 0))
      ),
  },
  {
    id: "big-flip",
    emoji: "💥",
    label: "Big Flip",
    description: "Scored 75+ points in a single Flip7 round",
    earned: (d, sessions) =>
      sessions.some(
        (s) => s.gameType === "flip7" && (s.rounds || []).some((r) => (r.scores?.[d.playerId] || 0) >= 75)
      ),
  },
  {
    id: "iron-man",
    emoji: "🦾",
    label: "Iron Man",
    description: "Played 3+ different games in one day",
    earned: (d, sessions) => {
      const byDay = new Map(); // "YYYY-MM-DD" -> Set of gameGroupKey
      for (const s of sessions) {
        const date = s.completedAt?.toDate?.();
        if (!date) continue;
        const dayKey = centralDayKey(date);
        const set = byDay.get(dayKey) || new Set();
        set.add(gameGroupKey(s));
        byDay.set(dayKey, set);
      }
      return Array.from(byDay.values()).some((set) => set.size >= 3);
    },
  },
  {
    id: "clean-sweep",
    emoji: "🧹",
    label: "Clean Sweep",
    description: "Won every game played on a single calendar day (2+ games)",
    earned: (d, sessions) => {
      const byDay = new Map(); // "YYYY-MM-DD" -> { games, wins }
      for (const s of sessions) {
        const date = s.completedAt?.toDate?.();
        if (!date) continue;
        const dayKey = centralDayKey(date);
        const entry = byDay.get(dayKey) || { games: 0, wins: 0 };
        entry.games += 1;
        if ((s.winnerIds || []).includes(d.playerId)) entry.wins += 1;
        byDay.set(dayKey, entry);
      }
      return Array.from(byDay.values()).some((e) => e.games >= 2 && e.wins === e.games);
    },
  },
  { id: "dominant", emoji: "💪", label: "Dominant", description: "Won 10 games", earned: (d) => d.wins >= 10 },
  { id: "champion", emoji: "🏆", label: "Champion", description: "Won 25 games", earned: (d) => d.wins >= 25 },
  {
    id: "underdog",
    emoji: "🐕",
    label: "Underdog",
    description: "Won a game after being dead last at the halfway point",
    earned: (d, sessions) => sessions.some((s) => didWin(s, d.playerId) && wasLastAtHalf(s, d.playerId)),
  },
  {
    id: "giant-slayer",
    emoji: "🗡️",
    label: "Giant Slayer",
    description: "Beat the player with the most wins when you had under half as many",
    earned: (d, sessions, all) => slewGiant(d.playerId, all),
  },
  {
    id: "specialist",
    emoji: "🎯",
    label: "Specialist",
    description: "Won the same game 5 times",
    earned: (d, sessions) => maxWinsInOneGame(d.playerId, sessions) >= 5,
  },
  {
    id: "master",
    emoji: "🧠",
    label: "Master",
    description: "Won the same game 15 times",
    earned: (d, sessions) => maxWinsInOneGame(d.playerId, sessions) >= 15,
  },
  {
    id: "globetrotter",
    emoji: "🌍",
    label: "Globetrotter",
    description: "Played 10 different games",
    earned: (d, sessions) => new Set(sessions.map(gameGroupKey)).size >= 10,
  },
  {
    id: "night-owl",
    emoji: "🦉",
    label: "Night Owl",
    description: "Played 5+ games in one day",
    earned: (d, sessions) => maxGamesInOneDay(sessions) >= 5,
  },
  {
    id: "loyal",
    emoji: "📅",
    label: "Loyal",
    description: "Played on 5 different days in one month",
    earned: (d, sessions) => maxDaysInOneMonth(sessions) >= 5,
  },
  {
    id: "nemesis",
    emoji: "😈",
    label: "Nemesis",
    description: "Beat the same player 5 games in a row",
    earned: (d, sessions) => hasNemesis(d.playerId, sessions),
  },
  {
    id: "streak-breaker",
    emoji: "✂️",
    label: "Streak Breaker",
    description: "Ended someone's 3+ game win streak",
    earned: (d, sessions, all) => brokeStreak(d.playerId, all),
  },
  {
    id: "phase-master",
    emoji: "🧗",
    label: "Phase Master",
    description: "Cleared all 10 phases in Phase 10 without missing one",
    earned: (d, sessions) => phaseMaster(d.playerId, sessions),
  },
  {
    id: "sky-jo-low-roller",
    emoji: "🪂",
    label: "Sky-Jo Low Roller",
    description: "Won Sky-Jo with a score under half the play-to score",
    earned: (d, sessions) =>
      sessions.some((s) => {
        if (!isSkyJo(s) || !didWin(s, d.playerId)) return false;
        const total = s.totals?.[d.playerId];
        const target = Number(s.config?.targetScore) || 100;
        return typeof total === "number" && total < target / 2;
      }),
  },
  {
    id: "dealers-luck",
    emoji: "🃏",
    label: "Dealer's Luck",
    description: "Won a game where you dealt the first hand (Oh Heck!, Phase 10, Royal Rum)",
    earned: (d, sessions) =>
      sessions.some((s) => DEALER_GAMES.has(s.gameType) && s.players?.[0]?.id === d.playerId && didWin(s, d.playerId)),
  },
  {
    id: "sequence-sweep",
    emoji: "🏁",
    label: "Sequence Sweep",
    description: "Won 3 \"just who won\" games in a row",
    earned: (d, sessions) =>
      longestStreakOf(sessions.filter((s) => s.config?.winnerOnly), d.playerId) >= 3,
  },
  {
    id: "camera-ready",
    emoji: "📸",
    label: "Camera Ready",
    description: "Set a color, an emoji avatar, and a photo — the full profile",
    earned: (d) => Boolean(d.color && d.avatar && d.photo),
  },
];

// Every badge, flagged with whether this player has earned it — lets the
// UI show locked ones too (greyed out) instead of just the earned list.
// Takes the raw completedSessions list (not just the summarized detail)
// since several badges above need per-round data computePlayerDetail
// doesn't carry.
export function computeAchievements(playerId, players, completedSessions) {
  const detail = computePlayerDetail(playerId, players, completedSessions);
  if (!detail) return [];
  const mySessions = completedSessions.filter((s) => (s.players || []).some((p) => p.id === playerId));
  return BADGE_DEFS.map((b) => ({
    id: b.id,
    emoji: b.emoji,
    label: b.label,
    description: b.description,
    earned: b.earned(detail, mySessions, completedSessions),
  }));
}

// All-time records across every player — powers the Hall of Fame page.
// No cross-game "biggest score ever" record here on purpose — scores
// aren't comparable across such different games (same reasoning as the
// removed Stats "Avg score"); the per-game equivalents below (Flip7 High
// Score) and computePlayerDetail's gamesByType are the honest versions of
// that idea.
// Everything in `items` that ties for the highest positive `valueOf`, plus
// that value. Returns null when nothing scores above zero. Ties are kept in
// the incoming order (the roster arrives name-sorted), so a tie never
// silently crowns whoever happened to be listed or played last.
function topTies(items, valueOf) {
  let max = 0;
  let leaders = [];
  for (const item of items) {
    const v = valueOf(item);
    if (!(v > 0)) continue;
    if (v > max) {
      max = v;
      leaders = [item];
    } else if (v === max) {
      leaders.push(item);
    }
  }
  return leaders.length ? { value: max, items: leaders } : null;
}

// Each record is { players: [...], value } with EVERY player tied for the
// lead (not just one), or null when nobody qualifies. Flip7 high score keeps
// per-player dates, and rivalry returns every pair tied for most games.
export function computeHallOfFame(players, completedSessions) {
  const nameById = new Map(players.map((p) => [p.id, p]));
  const asRecord = (top) => (top ? { value: top.value, players: top.items } : null);

  const allStats = computePlayerStats(players, completedSessions);
  const mostGamesPlayed = asRecord(topTies(allStats, (r) => r.gamesPlayed));
  if (mostGamesPlayed) mostGamesPlayed.players = mostGamesPlayed.players.map((r) => nameById.get(r.playerId));
  const mostWins = asRecord(topTies(allStats, (r) => r.wins));
  if (mostWins) mostWins.players = mostWins.players.map((r) => nameById.get(r.playerId));

  const longestStreakEver = asRecord(
    topTies(players, (p) => computePlayerDetail(p.id, players, completedSessions)?.longestStreak || 0)
  );

  // Biggest Achiever: whoever has unlocked the most badges. Runs the exact
  // same achievement engine PlayerDetail uses per player and counts the
  // earned ones, so this can never drift out of sync with what's actually
  // shown as unlocked on someone's own page.
  const biggestAchiever = asRecord(
    topTies(players, (p) => computeAchievements(p.id, players, completedSessions).filter((b) => b.earned).length)
  );

  // Euchre Royalty: most combined wins across every euchre-* variant
  // (2-player, 3-player, traditional, 15-card, Pick Your Partner).
  const euchreWins = new Map();
  for (const session of completedSessions) {
    if (!session.gameType?.startsWith("euchre")) continue;
    for (const id of session.winnerIds || []) {
      euchreWins.set(id, (euchreWins.get(id) || 0) + 1);
    }
  }
  const euchreRoyalty = asRecord(
    topTies(players, (p) => euchreWins.get(p.id) || 0)
  );

  // Flip7 High Score: the single best ROUND, not the final game total —
  // Flip7's round-to-round scoring is swingy enough that one big round is
  // its own kind of bragging right, distinct from who won the most games.
  // Everyone who hit the top score shows up (each player once, with the most
  // recent time they did it).
  let flip7HighScore = null; // {value, entries: [{player, completedAt}]}
  for (const session of completedSessions) {
    if (session.gameType !== "flip7") continue;
    const completedAt = session.completedAt?.toDate?.() || null;
    for (const round of session.rounds || []) {
      for (const [id, score] of Object.entries(round.scores || {})) {
        if (typeof score !== "number" || score <= 0) continue;
        const player = nameById.get(id);
        if (!player) continue;
        if (!flip7HighScore || score > flip7HighScore.value) {
          flip7HighScore = { value: score, entries: [{ player, completedAt }] };
        } else if (score === flip7HighScore.value) {
          const existing = flip7HighScore.entries.find((e) => e.player.id === id);
          if (!existing) flip7HighScore.entries.push({ player, completedAt });
          else if (completedAt && (!existing.completedAt || completedAt > existing.completedAt)) {
            existing.completedAt = completedAt;
          }
        }
      }
    }
  }

  // Table Regular: most distinct opponents played with across every game
  // ever logged.
  const opponentSets = new Map(); // playerId -> Set of other playerIds
  for (const session of completedSessions) {
    const ids = (session.players || []).map((p) => p.id);
    for (const id of ids) {
      const set = opponentSets.get(id) || new Set();
      for (const other of ids) {
        if (other !== id) set.add(other);
      }
      opponentSets.set(id, set);
    }
  }
  const tableRegular = asRecord(topTies(players, (p) => opponentSets.get(p.id)?.size || 0));

  // Rivalry: the pair(s) of players who've faced off (shared a session) the
  // most, with each one's win tally across those shared games. Not a
  // strict 1v1 record — most of these games seat more than two people —
  // just how often each half of the most-frequent pair won when they
  // were both at the table. Every pair tied for the most shared games is
  // returned.
  const pairSessions = new Map(); // "id1|id2" (sorted) -> sessions[]
  for (const session of completedSessions) {
    const ids = (session.players || []).map((p) => p.id);
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const key = [ids[i], ids[j]].sort().join("|");
        const list = pairSessions.get(key) || [];
        list.push(session);
        pairSessions.set(key, list);
      }
    }
  }
  const pairs = [];
  for (const [key, list] of pairSessions) {
    const [idA, idB] = key.split("|");
    const playerA = nameById.get(idA);
    const playerB = nameById.get(idB);
    if (!playerA || !playerB) continue;
    pairs.push({
      playerA,
      playerB,
      gamesTogether: list.length,
      winsA: list.filter((x) => (x.winnerIds || []).includes(idA)).length,
      winsB: list.filter((x) => (x.winnerIds || []).includes(idB)).length,
    });
  }
  const topPairs = topTies(pairs, (r) => r.gamesTogether);
  const rivalry = topPairs ? { value: topPairs.value, pairs: topPairs.items } : null;

  return { mostGamesPlayed, mostWins, longestStreakEver, euchreRoyalty, flip7HighScore, tableRegular, rivalry, biggestAchiever };
}
