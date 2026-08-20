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
  other: "Other",
};

export function computePlayerStats(players, completedSessions) {
  const byId = new Map(
    players.map((p) => [
      p.id,
      {
        playerId: p.id,
        name: p.name,
        color: p.color || null,
        active: p.active,
        gamesPlayed: 0,
        wins: 0,
        totalScore: 0,
        scoreCount: 0,
        gameCounts: {},
        lastPlayedAt: null,
      },
    ])
  );

  for (const session of completedSessions) {
    const totals = session.totals || {};
    for (const player of session.players || []) {
      const entry = byId.get(player.id);
      if (!entry) continue; // player removed since; skip
      entry.gamesPlayed += 1;
      entry.gameCounts[session.gameType] =
        (entry.gameCounts[session.gameType] || 0) + 1;
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
      const favoriteEntry = Object.entries(e.gameCounts).sort(
        (a, b) => b[1] - a[1]
      )[0];
      return {
        playerId: e.playerId,
        name: e.name,
        color: e.color,
        active: e.active,
        gamesPlayed: e.gamesPlayed,
        wins: e.wins,
        winPct: e.gamesPlayed ? Math.round((e.wins / e.gamesPlayed) * 100) : 0,
        avgScore: e.scoreCount ? Math.round(e.totalScore / e.scoreCount) : 0,
        totalScore: e.totalScore,
        favoriteGame: favoriteEntry
          ? GAME_LABELS[favoriteEntry[0]] || favoriteEntry[0]
          : "—",
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
        gameLabel: GAME_LABELS[s.gameType] || s.gameType,
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
    counts[session.gameType] = (counts[session.gameType] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([gameType, count]) => ({
      gameType,
      label: GAME_LABELS[gameType] || gameType,
      count,
    }))
    .sort((a, b) => b.count - a.count);
}
