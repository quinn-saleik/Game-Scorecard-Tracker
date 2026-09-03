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

function makeSession({ id, gameType, config, playerIds, winnerIds, totals, completedAt }) {
  return {
    id,
    gameType,
    config: config || {},
    players: playerIds.map((pid) => ({ id: pid, name: pid })),
    winnerIds: winnerIds || [],
    totals: totals || {},
    completedAt: ts(completedAt),
  };
}

describe("computePlayerStats", () => {
  it("tallies games played, wins, win %, and avg score per player", () => {
    const sessions = [
      makeSession({ id: "s1", gameType: "flip7", playerIds: ["p1", "p2"], winnerIds: ["p1"], totals: { p1: 200, p2: 150 }, completedAt: "2026-01-01" }),
      makeSession({ id: "s2", gameType: "flip7", playerIds: ["p1", "p2"], winnerIds: ["p2"], totals: { p1: 100, p2: 210 }, completedAt: "2026-01-02" }),
    ];
    const stats = computePlayerStats(players, sessions);
    const p1 = stats.find((s) => s.playerId === "p1");
    expect(p1.gamesPlayed).toBe(2);
    expect(p1.wins).toBe(1);
    expect(p1.winPct).toBe(50);
    expect(p1.avgScore).toBe(150); // (200 + 100) / 2

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
  it("returns an empty list for a null detail (unknown player)", () => {
    expect(computeAchievements(null)).toEqual([]);
  });

  it("marks badges earned/unearned based on the detail's thresholds", () => {
    const detail = {
      wins: 1,
      gamesPlayed: 12,
      winPct: 40,
      longestStreak: 3,
      history: [{ gameLabel: "Flip7" }, { gameLabel: "Oh Heck!" }],
    };
    const badges = computeAchievements(detail);
    const byId = Object.fromEntries(badges.map((b) => [b.id, b.earned]));
    expect(byId["first-win"]).toBe(true); // wins >= 1
    expect(byId["hot-streak"]).toBe(true); // longestStreak >= 3
    expect(byId["on-fire"]).toBe(false); // longestStreak < 5
    expect(byId["regular"]).toBe(true); // gamesPlayed >= 10
    expect(byId["veteran"]).toBe(false); // gamesPlayed < 25
    expect(byId["well-rounded"]).toBe(false); // only 2 distinct games, needs 5
    expect(byId["sharpshooter"]).toBe(false); // winPct 40 < 60
  });

  it("requires at least 5 games played for Sharpshooter even at a high win rate", () => {
    const detail = { wins: 2, gamesPlayed: 2, winPct: 100, longestStreak: 2, history: [] };
    const badges = computeAchievements(detail);
    expect(badges.find((b) => b.id === "sharpshooter").earned).toBe(false);
  });
});

describe("computeHallOfFame", () => {
  it("finds the single highest score across all sessions", () => {
    const sessions = [
      makeSession({ id: "s1", gameType: "flip7", playerIds: ["p1", "p2"], totals: { p1: 300, p2: 120 }, completedAt: "2026-01-01" }),
      makeSession({ id: "s2", gameType: "flip7", playerIds: ["p1", "p2"], totals: { p1: 90, p2: 450 }, completedAt: "2026-01-02" }),
    ];
    const hof = computeHallOfFame(players, sessions);
    expect(hof.biggestScore.score).toBe(450);
    expect(hof.biggestScore.player.id).toBe("p2");
  });

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
    expect(hof.biggestScore).toBeNull();
    expect(hof.mostGamesPlayed).toBeNull();
    expect(hof.mostWins).toBeNull();
    expect(hof.longestStreakEver).toBeNull();
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
});
