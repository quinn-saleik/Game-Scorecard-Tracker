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
};

function slug(s) {
  return (s || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
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

function gameGroupLabel(session) {
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
        color: p.color || null,
        avatar: p.avatar || null,
        photo: p.photo || null,
        active: p.active,
        gamesPlayed: 0,
        wins: 0,
        totalScore: 0,
        scoreCount: 0,
        gameCounts: {}, // groupKey -> {label, count}
        lastPlayedAt: null,
      },
    ])
  );

  for (const session of completedSessions) {
    const totals = session.totals || {};
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
      if (typeof totals[player.id] === "number") {
        entry.totalScore += totals[player.id];
        entry.scoreCount += 1;
      }
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
        color: e.color,
        avatar: e.avatar,
        photo: e.photo,
        active: e.active,
        gamesPlayed: e.gamesPlayed,
        wins: e.wins,
        winPct: e.gamesPlayed ? Math.round((e.wins / e.gamesPlayed) * 100) : 0,
        avgScore: e.scoreCount ? Math.round(e.totalScore / e.scoreCount) : 0,
        totalScore: e.totalScore,
        favoriteGame: favoriteEntry ? favoriteEntry.label : "—",
        lastPlayedAt: e.lastPlayedAt,
      };
    })
    .sort((a, b) => b.gamesPlayed - a.gamesPlayed);
}

// Full detail for one player's page: summary numbers (reusing the same
// definitions as computePlayerStats), game-by-game history newest first,
// and streak info. Win streaks only — no loss-streak tracking, just a
// "last game won" signal per the family-app framing (nobody needs their
// losing streak highlighted).
export function computePlayerDetail(playerId, players, completedSessions) {
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

  return {
    ...summary,
    history: playerSessions,
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
    counts[key] = counts[key] || { gameType: session.gameType, label, count: 0 };
    counts[key].count += 1;
  }
  return Object.values(counts).sort((a, b) => b.count - a.count);
}

// Achievement badges — simple all-time milestones, computed straight from
// the same data computePlayerDetail() already returns (gamesPlayed, wins,
// streaks, history). Nothing extra to store: add a badge here and every
// player's page picks it up on the next render.
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
    id: "sharpshooter",
    emoji: "🎯",
    label: "Sharpshooter",
    description: "60%+ win rate (5+ games played)",
    earned: (d) => d.gamesPlayed >= 5 && d.winPct >= 60,
  },
];

// Every badge, flagged with whether this player has earned it — lets the UI
// show locked ones too (greyed out) instead of just the earned list.
export function computeAchievements(detail) {
  if (!detail) return [];
  return BADGE_DEFS.map((b) => ({
    id: b.id,
    emoji: b.emoji,
    label: b.label,
    description: b.description,
    earned: b.earned(detail),
  }));
}

// All-time records across every player — powers the Hall of Fame page.
export function computeHallOfFame(players, completedSessions) {
  const nameById = new Map(players.map((p) => [p.id, p]));
  let biggestScore = null; // {player, score, gameLabel, completedAt}
  let mostGamesPlayed = null; // computed from computePlayerStats below
  let longestStreakEver = null; // {player, streak}

  for (const session of completedSessions) {
    const totals = session.totals || {};
    const label = gameGroupLabel(session);
    for (const p of session.players || []) {
      const score = totals[p.id];
      if (typeof score !== "number") continue;
      const player = nameById.get(p.id) || p;
      if (!biggestScore || score > biggestScore.score) {
        biggestScore = { player, score, gameLabel: label, completedAt: session.completedAt?.toDate?.() || null };
      }
    }
  }

  const allStats = computePlayerStats(players, completedSessions);
  mostGamesPlayed = allStats.reduce(
    (best, p) => (p.gamesPlayed > 0 && (!best || p.gamesPlayed > best.gamesPlayed) ? p : best),
    null
  );
  const mostWins = allStats.reduce(
    (best, p) => (p.wins > 0 && (!best || p.wins > best.wins) ? p : best),
    null
  );

  for (const p of players) {
    const detail = computePlayerDetail(p.id, players, completedSessions);
    if (detail && detail.longestStreak > 0 && (!longestStreakEver || detail.longestStreak > longestStreakEver.streak)) {
      longestStreakEver = { player: p, streak: detail.longestStreak };
    }
  }

  return { biggestScore, mostGamesPlayed, mostWins, longestStreakEver };
}
