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
// Phase 10 are always down; "Other" games decide their own direction per
// session (config.scoreDirection — read at the call site since it's a
// per-session setting, not per-gameType); everything else — including
// "31" lives, where more is safer — counts up. Shared between
// OngoingGames (ranking in-progress standings) and this file's per-game
// "best score" direction below.
export const LOWER_IS_BETTER = new Set(["euchre-3p", "royal-rum", "golf", "phase-10"]);

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
        favoriteGame: favoriteEntry ? favoriteEntry.label : "—",
        lastPlayedAt: e.lastPlayedAt,
      };
    })
    .sort((a, b) => b.gamesPlayed - a.gamesPlayed);
}

// Full detail for one player's page: summary numbers (reusing the same
// definitions as computePlayerStats), game-by-game history newest first,
// a per-game-type breakdown (games/wins/win%/avg/best score — see
// gamesByType below), and streak info. Win streaks only — no loss-streak
// tracking, just a "last game won" signal per the family-app framing
// (nobody needs their losing streak highlighted).
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

  // Per-game breakdown — "Flip7: average score, highest score, win %"
  // and so on for every game this player has a completed history in.
  // Reuses the same score already computed above (session.totals at
  // completion) rather than re-deriving anything from round data, so it
  // works uniformly for every game type. "Best" respects each game's own
  // direction (LOWER_IS_BETTER) so a 3-player Euchre "best" is their
  // lowest finish, not their highest.
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
      const lowerIsBetter = LOWER_IS_BETTER.has(e.gameType);
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
// "points" — there's no separate field for who caused it. So this reads
// as "both opponents got set at least once in a game you were part of",
// not a claim that this player personally set them both.
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
    id: "lone-wolf",
    emoji: "🐺🐺",
    label: "Lone Wolf",
    description: "Went alone 3+ times in a single Pick Your Partner game",
    earned: (d, sessions) =>
      sessions.some((s) => {
        if (s.gameType !== "euchre-partner") return false;
        const count = (s.rounds || []).filter((r) => r.bidderId === d.playerId && r.partnerId === "none").length;
        return count >= 3;
      }),
  },
  {
    id: "solo-streak",
    emoji: "🥷",
    label: "Solo Streak",
    description: "Went alone and made it 3 times, career",
    earned: (d, sessions) => {
      let count = 0;
      for (const s of sessions) {
        if (s.gameType !== "euchre-partner") continue;
        for (const r of s.rounds || []) {
          if (r.bidderId === d.playerId && r.partnerId === "none" && (r.tricks || 0) >= (r.bid || 0)) count += 1;
        }
      }
      return count >= 3;
    },
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
    id: "nil-streak",
    emoji: "🎣",
    label: "Nil Streak",
    description: "Called and hit a zero bid 3+ times in a single Oh Heck! game",
    earned: (d, sessions) =>
      sessions.some((s) => {
        if (s.gameType !== "oh-heck") return false;
        const count = (s.rounds || []).filter(
          (r) => r.bids?.[d.playerId] === 0 && r.results?.[d.playerId]?.hitBid === true
        ).length;
        return count >= 3;
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
    description: "Finished a 3-player Euchre game with 25+ points despite getting set",
    earned: (d, sessions) => sessions.some((s) => s.gameType === "euchre-3p" && (s.totals?.[d.playerId] || 0) >= 25),
  },
  {
    id: "double-trouble",
    emoji: "⚔️",
    label: "Double Trouble",
    description: "Both opponents got set at least once in the same 3-player Euchre game",
    earned: (d, sessions) =>
      sessions.some((s) => {
        if (s.gameType !== "euchre-3p") return false;
        const others = (s.players || []).map((p) => p.id).filter((id) => id !== d.playerId);
        if (others.length < 2) return false;
        const rounds = s.rounds || [];
        return others.every((oid) => rounds.some((r) => r.results?.[oid]?.type === "set"));
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
    id: "ice-cold",
    emoji: "🧊",
    label: "Ice Cold",
    description: "Scored exactly 0 in a single Flip7 round",
    earned: (d, sessions) =>
      sessions.some(
        (s) => s.gameType === "flip7" && (s.rounds || []).some((r) => (r.scores?.[d.playerId] ?? null) === 0)
      ),
  },
  {
    id: "hole-in-one",
    emoji: "⛳",
    label: "Hole in One",
    description: "Scored -4 or lower on a single hole in Golf",
    earned: (d, sessions) =>
      sessions.some(
        (s) => s.gameType === "golf" && (s.rounds || []).some((r) => (r.scores?.[d.playerId] ?? 0) <= -4)
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
        const dayKey = date.toISOString().slice(0, 10);
        const set = byDay.get(dayKey) || new Set();
        set.add(gameGroupKey(s));
        byDay.set(dayKey, set);
      }
      return Array.from(byDay.values()).some((set) => set.size >= 3);
    },
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
    earned: b.earned(detail, mySessions),
  }));
}

// All-time records across every player — powers the Hall of Fame page.
// No cross-game "biggest score ever" record here on purpose — scores
// aren't comparable across such different games (same reasoning as the
// removed Stats "Avg score"); the per-game equivalents below (Flip7 High
// Score) and computePlayerDetail's gamesByType are the honest versions of
// that idea.
export function computeHallOfFame(players, completedSessions) {
  const nameById = new Map(players.map((p) => [p.id, p]));
  let longestStreakEver = null; // {player, streak}
  let euchreRoyalty = null; // {player, wins}
  let flip7HighScore = null; // {player, score, completedAt}
  let tableRegular = null; // {player, opponentCount}

  const allStats = computePlayerStats(players, completedSessions);
  const mostGamesPlayed = allStats.reduce(
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

  // Euchre Royalty: most combined wins across every euchre-* variant
  // (2-player, 3-player, traditional, 15-card, Pick Your Partner).
  const euchreWins = new Map();
  for (const session of completedSessions) {
    if (!session.gameType?.startsWith("euchre")) continue;
    for (const id of session.winnerIds || []) {
      euchreWins.set(id, (euchreWins.get(id) || 0) + 1);
    }
  }
  for (const [id, wins] of euchreWins) {
    const player = nameById.get(id);
    if (player && (!euchreRoyalty || wins > euchreRoyalty.wins)) {
      euchreRoyalty = { player, wins };
    }
  }

  // Flip7 High Score: the single best ROUND, not the final game total —
  // Flip7's round-to-round scoring is swingy enough that one big round is
  // its own kind of bragging right, distinct from who won the most games.
  for (const session of completedSessions) {
    if (session.gameType !== "flip7") continue;
    const completedAt = session.completedAt?.toDate?.() || null;
    for (const round of session.rounds || []) {
      for (const [id, score] of Object.entries(round.scores || {})) {
        if (typeof score !== "number") continue;
        const player = nameById.get(id);
        if (!player) continue;
        if (!flip7HighScore || score > flip7HighScore.score) {
          flip7HighScore = { player, score, completedAt };
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
  for (const [id, set] of opponentSets) {
    const player = nameById.get(id);
    if (player && (!tableRegular || set.size > tableRegular.opponentCount)) {
      tableRegular = { player, opponentCount: set.size };
    }
  }

  // Rivalry: the pair of players who've faced off (shared a session) the
  // most, with each one's win tally across those shared games. Not a
  // strict 1v1 record — most of these games seat more than two people —
  // just how often each half of the most-frequent pair won when they
  // were both at the table.
  let rivalry = null; // {playerA, playerB, gamesTogether, winsA, winsB}
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
  for (const [key, list] of pairSessions) {
    if (rivalry && list.length <= rivalry.gamesTogether) continue;
    const [idA, idB] = key.split("|");
    const playerA = nameById.get(idA);
    const playerB = nameById.get(idB);
    if (!playerA || !playerB) continue;
    const winsA = list.filter((s) => (s.winnerIds || []).includes(idA)).length;
    const winsB = list.filter((s) => (s.winnerIds || []).includes(idB)).length;
    rivalry = { playerA, playerB, gamesTogether: list.length, winsA, winsB };
  }

  return { mostGamesPlayed, mostWins, longestStreakEver, euchreRoyalty, flip7HighScore, tableRegular, rivalry };
}
