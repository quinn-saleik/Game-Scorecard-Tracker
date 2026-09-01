// Shared round-editing helpers used by every Play screen's round history.
// Each game type stores its round records in a different shape; these two
// functions are the single place that knows how to read them back out, so
// "delete any past round" and the totals-recompute logic aren't duplicated
// six times across the game files.

export function getRoundDelta(gameType, round, playerId, session) {
  switch (gameType) {
    case "flip7":
    case "euchre-2p":
    case "other":
    case "hearts":
    case "cribbage":
    case "golf":
      return round.scores?.[playerId] || 0;
    case "oh-heck":
      return round.results?.[playerId]?.score || 0;
    case "euchre-3p":
    case "euchre-partner":
      return round.deltas?.[playerId] || 0;
    case "euchre-traditional":
    case "euchre-15card":
    case "catchphrase":
    case "canasta":
    case "pinochle":
    case "spades": {
      const teamA = session?.config?.teamA || [];
      const teamB = session?.config?.teamB || [];
      if (teamA.includes(playerId)) return round.teamAPoints || 0;
      if (teamB.includes(playerId)) return round.teamBPoints || 0;
      return 0;
    }
    case "thirty-one":
      return round.lostLifeIds?.includes(playerId) ? -1 : 0;
    case "royal-rum":
      return round.points?.[playerId] || 0;
    case "gin-rummy":
      return round.winnerId === playerId ? round.pointsAwarded || 0 : 0;
    default:
      return 0;
  }
}

// Exported so a fresh rematch session (src/data/gameSessions.js) can seed
// its starting totals the same way a brand-new game's Setup screen does,
// without duplicating each game type's "who starts where" rule a second time.
export function getInitialTotals(gameType, session) {
  if (gameType === "euchre-3p") {
    const start = session.config?.startingScore ?? 15;
    return Object.fromEntries(session.players.map((p) => [p.id, start]));
  }
  if (gameType === "thirty-one") {
    const start = session.config?.startingLives ?? 3;
    return Object.fromEntries(session.players.map((p) => [p.id, start]));
  }
  return Object.fromEntries(session.players.map((p) => [p.id, 0]));
}

// Note: Hearts, Cribbage, and Golf all use the same free-form
// per-player round.scores shape as Flip7/Other — Hearts and Golf are just
// lower-is-better (see OngoingGames' LOWER_IS_BETTER set and each Play
// screen's own end-condition) and Golf ends after a fixed number of holes
// rather than a score threshold.
//
// Canasta, Pinochle, and Spades reuse the teamAPoints/teamBPoints shape —
// each Play screen precomputes that hand's net point swing (including
// bid/set math, melds, or nil bonuses) before saving, same as Euchre
// (traditional/15-card) already does with tricks-vs-bid.
//
// Royal Rum's per-player completed-goal checklist (6-12) isn't a
// running numeric total, so it's derived straight from the rounds array in
// RoyalRumPlay.jsx rather than through getRoundDelta/recomputeTotals — only
// its point score (round.points) goes through the normal path above.

// Recompute totals from scratch given a (possibly edited) rounds array —
// used after deleting a round from anywhere in the history, not just the
// most recent one, where simple subtraction from the last round no longer
// applies.
export function recomputeTotals(gameType, session, rounds) {
  const totals = getInitialTotals(gameType, session);
  for (const round of rounds) {
    for (const p of session.players) {
      totals[p.id] = (totals[p.id] || 0) + getRoundDelta(gameType, round, p.id, session);
    }
  }
  return totals;
}
