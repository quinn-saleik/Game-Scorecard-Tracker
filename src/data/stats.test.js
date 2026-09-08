import { describe, it, expect } from "vitest";
import {
  computePlayerStats,
  computePlayerDetail,
  computeGameStats,
  computeAchievements,
  computeHallOfFame,
} from "./stats";

// Firestore Timestamps expose .toDate() — every consumer in stats.js reads
// completedAt that way, so fixtures need to match that shape rather than a
// plain Date.
function ts(iso) {
  return { toDate: () => new Date(iso) };
}

const players = [
  { id: "p1", name: "Marsha" },
  { id: "p2", name: "Doug" },
  { id: "p3", name: "Riley" },
];

function makeSession({ id, gameType, config, playerIds, winnerIds, totals, rounds, completedAt }) {
  return {
    id,
    gameType,
    config: config || {},
    players: playerIds.map((pid) => ({ id: pid, name: pid })),
    winnerIds: winnerIds || [],
    totals: totals || {},
    rounds: rounds || [],
    completedAt: ts(completedAt),
  };
}

describe("computePlayerStats", () => {
  it("tallies games played, wins, and win % per player", () => {
    const sessions = [
      makeSession({ id: "s1", gameType: "flip7", playerIds: ["p1", "p2"], winnerIds: ["p1"], totals: { p1: 200, p2: 150 }, completedAt: "2026-01-01" }),
      makeSession({ id: "s2", gameType: "flip7", playerIds: ["p1", "p2"], winnerIds: ["p2"], totals: { p1: 100, p2: 210 }, completedAt: "2026-01-02" }),
    ];
    const stats = computePlayerStats(players, sessions);
    const p1 = stats.find((s) => s.playerId === "p1");
    expect(p1.gamesPlayed).toBe(2);
    expect(p1.wins).toBe(1);
    expect(p1.winPct).toBe(50);

    const p3 = stats.find((s) => s.playerId === "p3");
    expect(p3.gamesPlayed).toBe(0);
    expect(p3.winPct).toBe(0); // no divide-by-zero
    expect(p3.favoriteGame).toBe("—");
  });

  it("groups 'Other' sessions by their custom name instead of lumping them together", () => {
    const sessions = [
      makeSession({ id: "s1", gameType: "other", config: { customName: "Poker" }, playerIds: ["p1"], completedAt: "2026-01-01" }),
      makeSession({ id: "s2", gameType: "other", config: { customName: "Poker" }, playerIds: ["p1"], completedAt: "2026-01-02" }),
      makeSession({ id: "s3", gameType: "other", config: { customName: "Yahtzee" }, playerIds: ["p1"], completedAt: "2026-01-03" }),
    ];
    const [p1] = computePlayerStats([players[0]], sessions);
    expect(p1.gamesPlayed).toBe(3);
    expect(p1.favoriteGame).toBe("Poker"); // 2 Poker vs 1 Yahtzee
  });

  it("skips a player who no longer exists on the roster without crashing", () => {
    const sessions = [
      makeSession({ id: "s1", gameType: "flip7", playerIds: ["ghost-id"], winnerIds: ["ghost-id"], totals: { "ghost-id": 50 }, completedAt: "2026-01-01" }),
    ];
    expect(() => computePlayerStats(players, sessions)).not.toThrow();
  });

  it("tracks the most recent lastPlayedAt across sessions", () => {
    const sessions = [
      makeSession({ id: "s1", gameType: "flip7", playerIds: ["p1"], completedAt: "2026-01-01" }),
      makeSession({ id: "s2", gameType: "flip7", playerIds: ["p1"], completedAt: "2026-03-15" }),
      makeSession({ id: "s3", gameType: "flip7", playerIds: ["p1"], completedAt: "2026-02-01" }),
    ];
    const [p1] = computePlayerStats([players[0]], sessions);
    expect(p1.lastPlayedAt.toISOString().slice(0, 10)).toBe("2026-03-15");
  });
});

describe("computePlayerDetail", () => {
  it("returns null for an unknown player instead of throwing", () => {
    expect(computePlayerDetail("nobody", players, [])).toBeNull();
  });

  it("orders history newest-first and computes current + longest win streaks", () => {
    const sessions = [
      makeSession({ id: "s1", gameType: "flip7", playerIds: ["p1"], winnerIds: ["p1"], completedAt: "2026-01-01" }),
      makeSession({ id: "s2", gameType: "flip7", playerIds: ["p1"], winnerIds: ["p1"], completedAt: "2026-01-02" }),
      makeSession({ id: "s3", gameType: "flip7", playerIds: ["p1"], winnerIds: [], completedAt: "2026-01-03" }), // lost, breaks streak
      makeSession({ id: "s4", gameType: "flip7", playerIds: ["p1"], winnerIds: ["p1"], completedAt: "2026-01-04" }),
    ];
    const detail = computePlayerDetail("p1", players, sessions);
    expect(detail.history.map((h) => h.sessionId)).toEqual(["s4", "s3", "s2", "s1"]);
    expect(detail.longestStreak).toBe(2); // s1 -> s2
    expect(detail.currentStreak).toBe(1); // only s4, since s3 (more recent than s1/s2) was a loss
    expect(detail.lastWin.gameLabel).toBe("Flip7");
  });

  it("reports zero streaks and no lastWin for a player who's never won", () => {
    const sessions = [
      makeSession({ id: "s1", gameType: "flip7", playerIds: ["p1"], winnerIds: [], completedAt: "2026-01-01" }),
    ];
    const detail = computePlayerDetail("p1", players, sessions);
    expect(detail.currentStreak).toBe(0);
    expect(detail.longestStreak).toBe(0);
    expect(detail.lastWin).toBeNull();
  });
});

describe("computeGameStats", () => {
  it("counts sessions per game, splitting 'Other' by custom name", () => {
    const sessions = [
      makeSession({ id: "s1", gameType: "flip7", playerIds: ["p1"], completedAt: "2026-01-01" }),
      makeSession({ id: "s2", gameType: "flip7", playerIds: ["p1"], completedAt: "2026-01-02" }),
      makeSession({ id: "s3", gameType: "other", config: { customName: "Poker" }, playerIds: ["p1"], completedAt: "2026-01-03" }),
    ];
    const counts = computeGameStats(sessions);
    expect(counts.find((c) => c.label === "Flip7").count).toBe(2);
    expect(counts.find((c) => c.label === "Poker").count).toBe(1);
  });

  it("gives two different custom 'Other' games distinct groupKeys, not just the shared gameType", () => {
    // Regression test: every custom game shares gameType "other", so a UI
    // list keyed by gameType (e.g. React's `key` prop) would collide two
    // different custom games into a single row. groupKey is what actually
    // distinguishes them.
    const sessions = [
      makeSession({ id: "s1", gameType: "other", config: { customName: "Poker" }, playerIds: ["p1"], completedAt: "2026-01-01" }),
      makeSession({ id: "s2", gameType: "other", config: { customName: "Yahtzee" }, playerIds: ["p1"], completedAt: "2026-01-02" }),
    ];
    const counts = computeGameStats(sessions);
    expect(counts).toHaveLength(2);
    const groupKeys = counts.map((c) => c.groupKey);
    expect(new Set(groupKeys).size).toBe(2);
    expect(counts.find((c) => c.label === "Poker").count).toBe(1);
    expect(counts.find((c) => c.label === "Yahtzee").count).toBe(1);
  });
});

describe("computeAchievements", () => {
  it("returns an empty list for an unknown player", () => {
    expect(computeAchievements("nobody", players, [])).toEqual([]);
  });

  it("marks the aggregate badges earned/unearned based on career thresholds", () => {
    const sessions = [
      makeSession({ id: "s1", gameType: "flip7", playerIds: ["p1"], winnerIds: ["p1"], completedAt: "2026-01-01" }),
      makeSession({ id: "s2", gameType: "oh-heck", playerIds: ["p1"], winnerIds: [], completedAt: "2026-01-02" }),
    ];
    const badges = computeAchievements("p1", players, sessions);
    const byId = Object.fromEntries(badges.map((b) => [b.id, b.earned]));
    expect(byId["first-win"]).toBe(true); // wins >= 1
    expect(byId["hot-streak"]).toBe(false); // longestStreak < 3
    expect(byId["regular"]).toBe(false); // gamesPlayed < 10
    expect(byId["well-rounded"]).toBe(false); // only 2 distinct games, needs 5
    expect(byId["sharpshooter"]).toBe(false); // fewer than 5 games played
  });

  it("awards Went Alone only when the bidder went alone AND made the bid", () => {
    const madeIt = [
      makeSession({
        id: "s1",
        gameType: "euchre-partner",
        playerIds: ["p1", "p2", "p3"],
        rounds: [{ bidderId: "p1", partnerId: "none", bid: 3, tricks: 3 }],
        completedAt: "2026-01-01",
      }),
    ];
    expect(computeAchievements("p1", players, madeIt).find((b) => b.id === "went-alone").earned).toBe(true);

    const wentAloneButMissed = [
      makeSession({
        id: "s1",
        gameType: "euchre-partner",
        playerIds: ["p1", "p2", "p3"],
        rounds: [{ bidderId: "p1", partnerId: "none", bid: 3, tricks: 2 }],
        completedAt: "2026-01-01",
      }),
    ];
    expect(computeAchievements("p1", players, wentAloneButMissed).find((b) => b.id === "went-alone").earned).toBe(false);
  });

  it("awards Perfect Game only when every round hit the bid, and Zero Hero only when every round took zero tricks", () => {
    const perfect = [
      makeSession({
        id: "s1",
        gameType: "oh-heck",
        playerIds: ["p1", "p2"],
        rounds: [
          { results: { p1: { hitBid: true, tricksWon: 2, score: 12 } } },
          { results: { p1: { hitBid: true, tricksWon: 0, score: 10 } } },
        ],
        completedAt: "2026-01-01",
      }),
    ];
    const perfectBadges = computeAchievements("p1", players, perfect);
    expect(perfectBadges.find((b) => b.id === "perfect-game").earned).toBe(true);
    // Hit bid on a zero-trick round too, so this ISN'T a Zero Hero game
    // (it had a round with 2 tricks won).
    expect(perfectBadges.find((b) => b.id === "zero-hero").earned).toBe(false);

    const zeroTricksAllGame = [
      makeSession({
        id: "s2",
        gameType: "oh-heck",
        playerIds: ["p1", "p2"],
        rounds: [
          { results: { p1: { hitBid: false, tricksWon: 0, score: 0 } } },
          { results: { p1: { hitBid: true, tricksWon: 0, score: 10 } } },
        ],
        completedAt: "2026-01-02",
      }),
    ];
    expect(computeAchievements("p1", players, zeroTricksAllGame).find((b) => b.id === "zero-hero").earned).toBe(true);
  });

  it("awards Big Flip for a 75+ point Flip7 round, regardless of the game's final total", () => {
    const sessions = [
      makeSession({
        id: "s1",
        gameType: "flip7",
        playerIds: ["p1", "p2"],
        rounds: [{ scores: { p1: 80, p2: 10 } }],
        completedAt: "2026-01-01",
      }),
    ];
    expect(computeAchievements("p1", players, sessions).find((b) => b.id === "big-flip").earned).toBe(true);
    expect(computeAchievements("p2", players, sessions).find((b) => b.id === "big-flip").earned).toBe(false);
  });

  it("awards Nil Streak for hitting a called zero bid 3+ times in a single Oh Heck! game", () => {
    const threeNils = [
      makeSession({
        id: "s1",
        gameType: "oh-heck",
        playerIds: ["p1", "p2"],
        rounds: [
          { bids: { p1: 0 }, results: { p1: { hitBid: true, tricksWon: 0, score: 10 } } },
          { bids: { p1: 0 }, results: { p1: { hitBid: true, tricksWon: 0, score: 10 } } },
          { bids: { p1: 1 }, results: { p1: { hitBid: true, tricksWon: 1, score: 11 } } },
          { bids: { p1: 0 }, results: { p1: { hitBid: true, tricksWon: 0, score: 10 } } },
        ],
        completedAt: "2026-01-01",
      }),
    ];
    expect(computeAchievements("p1", players, threeNils).find((b) => b.id === "nil-streak").earned).toBe(true);

    const onlyTwoNils = [
      makeSession({
        id: "s1",
        gameType: "oh-heck",
        playerIds: ["p1", "p2"],
        rounds: [
          { bids: { p1: 0 }, results: { p1: { hitBid: true, tricksWon: 0, score: 10 } } },
          { bids: { p1: 0 }, results: { p1: { hitBid: true, tricksWon: 0, score: 10 } } },
        ],
        completedAt: "2026-01-01",
      }),
    ];
    expect(computeAchievements("p1", players, onlyTwoNils).find((b) => b.id === "nil-streak").earned).toBe(false);
  });

  it("awards Ice Cold for a Flip7 round scored exactly 0", () => {
    const sessions = [
      makeSession({
        id: "s1",
        gameType: "flip7",
        playerIds: ["p1", "p2"],
        rounds: [{ scores: { p1: 0, p2: 40 } }],
        completedAt: "2026-01-01",
      }),
    ];
    expect(computeAchievements("p1", players, sessions).find((b) => b.id === "ice-cold").earned).toBe(true);
    expect(computeAchievements("p2", players, sessions).find((b) => b.id === "ice-cold").earned).toBe(false);
  });

  it("awards Hole in One for a Golf hole scored -4 or lower", () => {
    const sessions = [
      makeSession({
        id: "s1",
        gameType: "golf",
        playerIds: ["p1", "p2"],
        rounds: [{ scores: { p1: -4, p2: 2 } }],
        completedAt: "2026-01-01",
      }),
    ];
    expect(computeAchievements("p1", players, sessions).find((b) => b.id === "hole-in-one").earned).toBe(true);
    expect(computeAchievements("p2", players, sessions).find((b) => b.id === "hole-in-one").earned).toBe(false);
  });

  it("awards Iron Man for 3+ different games completed on the same calendar day", () => {
    const sameDay = [
      makeSession({ id: "s1", gameType: "flip7", playerIds: ["p1"], completedAt: "2026-01-01T10:00:00Z" }),
      makeSession({ id: "s2", gameType: "oh-heck", playerIds: ["p1"], completedAt: "2026-01-01T14:00:00Z" }),
      makeSession({ id: "s3", gameType: "golf", playerIds: ["p1"], completedAt: "2026-01-01T20:00:00Z" }),
    ];
    expect(computeAchievements("p1", players, sameDay).find((b) => b.id === "iron-man").earned).toBe(true);

    const spreadOut = [
      makeSession({ id: "s1", gameType: "flip7", playerIds: ["p1"], completedAt: "2026-01-01T10:00:00Z" }),
      makeSession({ id: "s2", gameType: "oh-heck", playerIds: ["p1"], completedAt: "2026-01-02T14:00:00Z" }),
      makeSession({ id: "s3", gameType: "golf", playerIds: ["p1"], completedAt: "2026-01-03T20:00:00Z" }),
    ];
    expect(computeAchievements("p1", players, spreadOut).find((b) => b.id === "iron-man").earned).toBe(false);
  });
});

describe("computePlayerDetail — per-game breakdown", () => {
  it("computes avg/best score per game, respecting each game's LOWER_IS_BETTER direction", () => {
    const sessions = [
      makeSession({ id: "s1", gameType: "flip7", playerIds: ["p1"], totals: { p1: 100 }, completedAt: "2026-01-01" }),
      makeSession({ id: "s2", gameType: "flip7", playerIds: ["p1"], totals: { p1: 200 }, completedAt: "2026-01-02" }),
      makeSession({ id: "s3", gameType: "euchre-3p", playerIds: ["p1"], totals: { p1: 10 }, completedAt: "2026-01-03" }),
      makeSession({ id: "s4", gameType: "euchre-3p", playerIds: ["p1"], totals: { p1: 0 }, completedAt: "2026-01-04" }),
    ];
    const detail = computePlayerDetail("p1", players, sessions);
    const flip7 = detail.gamesByType.find((g) => g.label === "Flip7");
    expect(flip7.gamesPlayed).toBe(2);
    expect(flip7.avgScore).toBe(150);
    expect(flip7.bestScore).toBe(200); // higher is better

    const euchre3p = detail.gamesByType.find((g) => g.label === "Euchre (3-player)");
    expect(euchre3p.bestScore).toBe(0); // lower is better — 0 beats 10
  });
});

describe("computeHallOfFame", () => {
  it("finds most games played and most wins independently", () => {
    const sessions = [
      makeSession({ id: "s1", gameType: "flip7", playerIds: ["p1", "p2"], winnerIds: ["p2"], completedAt: "2026-01-01" }),
      makeSession({ id: "s2", gameType: "flip7", playerIds: ["p1", "p2"], winnerIds: ["p2"], completedAt: "2026-01-02" }),
      makeSession({ id: "s3", gameType: "flip7", playerIds: ["p1"], winnerIds: ["p1"], completedAt: "2026-01-03" }),
    ];
    const hof = computeHallOfFame(players, sessions);
    expect(hof.mostGamesPlayed.playerId).toBe("p1"); // 3 games vs p2's 2
    expect(hof.mostWins.playerId).toBe("p2"); // 2 wins vs p1's 1
  });

  it("returns nulls for every record when there are no completed sessions", () => {
    const hof = computeHallOfFame(players, []);
    expect(hof.mostGamesPlayed).toBeNull();
    expect(hof.mostWins).toBeNull();
    expect(hof.longestStreakEver).toBeNull();
    expect(hof.euchreRoyalty).toBeNull();
    expect(hof.flip7HighScore).toBeNull();
    expect(hof.tableRegular).toBeNull();
    expect(hof.rivalry).toBeNull();
  });

  it("finds the longest win streak across all players, not just the top scorer", () => {
    const sessions = [
      makeSession({ id: "s1", gameType: "flip7", playerIds: ["p1"], winnerIds: ["p1"], completedAt: "2026-01-01" }),
      makeSession({ id: "s2", gameType: "flip7", playerIds: ["p1"], winnerIds: ["p1"], completedAt: "2026-01-02" }),
      makeSession({ id: "s3", gameType: "flip7", playerIds: ["p1"], winnerIds: ["p1"], completedAt: "2026-01-03" }),
      makeSession({ id: "s4", gameType: "flip7", playerIds: ["p2"], winnerIds: ["p2"], completedAt: "2026-01-01" }),
    ];
    const hof = computeHallOfFame(players, sessions);
    expect(hof.longestStreakEver.player.id).toBe("p1");
    expect(hof.longestStreakEver.streak).toBe(3);
  });

  it("tallies Euchre Royalty across every euchre-* variant combined, not just one", () => {
    const sessions = [
      makeSession({ id: "s1", gameType: "euchre-2p", playerIds: ["p1", "p2"], winnerIds: ["p1"], completedAt: "2026-01-01" }),
      makeSession({ id: "s2", gameType: "euchre-3p", playerIds: ["p1", "p2", "p3"], winnerIds: ["p1"], completedAt: "2026-01-02" }),
      makeSession({ id: "s3", gameType: "euchre-partner", playerIds: ["p1", "p2", "p3"], winnerIds: ["p2"], completedAt: "2026-01-03" }),
    ];
    const hof = computeHallOfFame(players, sessions);
    expect(hof.euchreRoyalty.player.id).toBe("p1"); // 2 combined wins vs p2's 1
    expect(hof.euchreRoyalty.wins).toBe(2);
  });

  it("finds the single highest Flip7 ROUND, not the highest final game total", () => {
    const sessions = [
      makeSession({
        id: "s1",
        gameType: "flip7",
        playerIds: ["p1", "p2"],
        totals: { p1: 210, p2: 90 },
        rounds: [{ scores: { p1: 60, p2: 30 } }, { scores: { p1: 150, p2: 60 } }],
        completedAt: "2026-01-01",
      }),
    ];
    const hof = computeHallOfFame(players, sessions);
    expect(hof.flip7HighScore.score).toBe(150);
    expect(hof.flip7HighScore.player.id).toBe("p1");
  });

  it("finds Table Regular as the player with the most distinct opponents across all history", () => {
    const sessions = [
      makeSession({ id: "s1", gameType: "flip7", playerIds: ["p1", "p2"], completedAt: "2026-01-01" }),
      makeSession({ id: "s2", gameType: "flip7", playerIds: ["p1", "p3"], completedAt: "2026-01-02" }),
      makeSession({ id: "s3", gameType: "flip7", playerIds: ["p2", "p3"], completedAt: "2026-01-03" }),
    ];
    const hof = computeHallOfFame(players, sessions);
    // p1 has played with p2 and p3 (2 opponents); p2 and p3 have each only played with 2 others too — pick p1 since it's first computed with the max, ties are fine to land on any of the 2-opponent players.
    expect(hof.tableRegular.opponentCount).toBe(2);
  });

  it("finds Rivalry as the pair who've shared the most sessions, with each one's win tally", () => {
    const sessions = [
      makeSession({ id: "s1", gameType: "flip7", playerIds: ["p1", "p2"], winnerIds: ["p1"], completedAt: "2026-01-01" }),
      makeSession({ id: "s2", gameType: "flip7", playerIds: ["p1", "p2"], winnerIds: ["p2"], completedAt: "2026-01-02" }),
      makeSession({ id: "s3", gameType: "flip7", playerIds: ["p1", "p2"], winnerIds: ["p1"], completedAt: "2026-01-03" }),
      makeSession({ id: "s4", gameType: "flip7", playerIds: ["p1", "p3"], winnerIds: ["p3"], completedAt: "2026-01-04" }),
    ];
    const hof = computeHallOfFame(players, sessions);
    expect(hof.rivalry.gamesTogether).toBe(3); // p1/p2 shared 3 games vs p1/p3's 1
    const ids = [hof.rivalry.playerA.id, hof.rivalry.playerB.id].sort();
    expect(ids).toEqual(["p1", "p2"]);
    const winsById = { [hof.rivalry.playerA.id]: hof.rivalry.winsA, [hof.rivalry.playerB.id]: hof.rivalry.winsB };
    expect(winsById.p1).toBe(2);
    expect(winsById.p2).toBe(1);
  });
});
