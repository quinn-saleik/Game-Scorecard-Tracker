import { describe, it, expect } from "vitest";
import { getRoundDelta, getInitialTotals, recomputeTotals } from "./rounds";

// Minimal session fixtures — just enough shape for each gameType branch to
// read what it needs (players list, and config for the team-based games).
const twoPlayers = [{ id: "p1" }, { id: "p2" }];
const fourPlayers = [{ id: "p1" }, { id: "p2" }, { id: "p3" }, { id: "p4" }];

function session(players, config) {
  return { players, config: config || {} };
}

describe("getRoundDelta", () => {
  it("reads scores-keyed games (flip7, euchre-2p, other) by playerId", () => {
    const round = { scores: { p1: 42, p2: -3 } };
    for (const gameType of ["flip7", "euchre-2p", "other"]) {
      expect(getRoundDelta(gameType, round, "p1")).toBe(42);
      expect(getRoundDelta(gameType, round, "p2")).toBe(-3);
      expect(getRoundDelta(gameType, round, "p3")).toBe(0); // absent player -> 0, not undefined
    }
  });

  it("reads oh-heck from round.results[playerId].score", () => {
    const round = { results: { p1: { score: 12, tricksBid: 2, tricksWon: 2 }, p2: { score: 0 } } };
    expect(getRoundDelta("oh-heck", round, "p1")).toBe(12);
    expect(getRoundDelta("oh-heck", round, "p2")).toBe(0);
    expect(getRoundDelta("oh-heck", round, "p3")).toBe(0);
  });

  it("reads deltas-keyed games (euchre-3p, euchre-partner) by playerId", () => {
    const round = { deltas: { p1: -2, p2: 4 } };
    for (const gameType of ["euchre-3p", "euchre-partner"]) {
      expect(getRoundDelta(gameType, round, "p1")).toBe(-2);
      expect(getRoundDelta(gameType, round, "p2")).toBe(4);
    }
  });

  it("routes team-points games (euchre-traditional, euchre-15card, catchphrase) via session.config teams", () => {
    const s = session(fourPlayers, { teamA: ["p1", "p2"], teamB: ["p3", "p4"] });
    const round = { teamAPoints: 3, teamBPoints: -1 };
    for (const gameType of ["euchre-traditional", "euchre-15card", "catchphrase"]) {
      expect(getRoundDelta(gameType, round, "p1", s)).toBe(3);
      expect(getRoundDelta(gameType, round, "p2", s)).toBe(3);
      expect(getRoundDelta(gameType, round, "p3", s)).toBe(-1);
      expect(getRoundDelta(gameType, round, "p4", s)).toBe(-1);
    }
  });

  it("returns 0 for a team-points game when the player is on neither roster", () => {
    const s = session(fourPlayers, { teamA: ["p1", "p2"], teamB: ["p3"] });
    const round = { teamAPoints: 3, teamBPoints: -1 };
    expect(getRoundDelta("catchphrase", round, "p4", s)).toBe(0);
  });

  it("scores thirty-one as -1 life for anyone in lostLifeIds, 0 otherwise", () => {
    const round = { lostLifeIds: ["p1"] };
    expect(getRoundDelta("thirty-one", round, "p1")).toBe(-1);
    expect(getRoundDelta("thirty-one", round, "p2")).toBe(0);
  });

  it("handles a thirty-one wash round (nobody lost a life)", () => {
    const round = { lostLifeIds: [] };
    expect(getRoundDelta("thirty-one", round, "p1")).toBe(0);
    expect(getRoundDelta("thirty-one", round, "p2")).toBe(0);
  });

  it("reads royal-rum points by playerId, defaulting to 0 for a completed-goal hand", () => {
    const round = { points: { p1: 0, p2: 47 } }; // p1 checked off a goal that hand -> 0 points
    expect(getRoundDelta("royal-rum", round, "p1")).toBe(0);
    expect(getRoundDelta("royal-rum", round, "p2")).toBe(47);
  });

  it("returns 0 for an unknown gameType instead of throwing", () => {
    expect(getRoundDelta("some-future-game", {}, "p1")).toBe(0);
  });

  it("tolerates a round with no matching field at all (no NaN, no throw)", () => {
    expect(getRoundDelta("flip7", {}, "p1")).toBe(0);
    expect(getRoundDelta("oh-heck", {}, "p1")).toBe(0);
    expect(getRoundDelta("euchre-3p", {}, "p1")).toBe(0);
  });
});

describe("getInitialTotals", () => {
  it("starts euchre-3p at 15 by default (counts down)", () => {
    const s = session(twoPlayers.concat({ id: "p3" }));
    expect(getInitialTotals("euchre-3p", s)).toEqual({ p1: 15, p2: 15, p3: 15 });
  });

  it("respects a custom euchre-3p startingScore", () => {
    const s = session(twoPlayers, { startingScore: 21 });
    expect(getInitialTotals("euchre-3p", s)).toEqual({ p1: 21, p2: 21 });
  });

  it("starts thirty-one at 3 lives by default", () => {
    const s = session(twoPlayers);
    expect(getInitialTotals("thirty-one", s)).toEqual({ p1: 3, p2: 3 });
  });

  it("respects a custom thirty-one startingLives", () => {
    const s = session(twoPlayers, { startingLives: 5 });
    expect(getInitialTotals("thirty-one", s)).toEqual({ p1: 5, p2: 5 });
  });

  it("starts every other game type at 0", () => {
    const s = session(twoPlayers);
    for (const gameType of ["flip7", "oh-heck", "euchre-traditional", "catchphrase", "royal-rum", "other"]) {
      expect(getInitialTotals(gameType, s)).toEqual({ p1: 0, p2: 0 });
    }
  });
});

describe("recomputeTotals", () => {
  it("accumulates a simple scores-keyed game across multiple rounds", () => {
    const s = session(twoPlayers);
    const rounds = [{ scores: { p1: 10, p2: 5 } }, { scores: { p1: 3, p2: 8 } }];
    expect(recomputeTotals("flip7", s, rounds)).toEqual({ p1: 13, p2: 13 });
  });

  it("matches what deleting a round from the middle should produce (undo/edit path)", () => {
    const s = session(twoPlayers);
    const allRounds = [
      { scores: { p1: 10, p2: 5 } },
      { scores: { p1: 100, p2: 1 } }, // this one gets deleted
      { scores: { p1: 3, p2: 8 } },
    ];
    const afterDelete = [allRounds[0], allRounds[2]];
    expect(recomputeTotals("flip7", s, afterDelete)).toEqual({ p1: 13, p2: 13 });
  });

  it("counts thirty-one lives down from the starting total and stops making sense below the game's own elimination rule (pure math only)", () => {
    const s = session(twoPlayers, { startingLives: 3 });
    const rounds = [{ lostLifeIds: ["p1"] }, { lostLifeIds: ["p1"] }, { lostLifeIds: [] }];
    expect(recomputeTotals("thirty-one", s, rounds)).toEqual({ p1: 1, p2: 3 });
  });

  it("recomputes a team game's totals correctly after removing a hand", () => {
    const s = session(fourPlayers, { teamA: ["p1", "p2"], teamB: ["p3", "p4"] });
    const rounds = [
      { teamAPoints: 2, teamBPoints: -2 },
      { teamAPoints: 4, teamBPoints: -2 }, // deleted
      { teamAPoints: 1, teamBPoints: 4 },
    ];
    const afterDelete = [rounds[0], rounds[2]];
    expect(recomputeTotals("euchre-traditional", s, afterDelete)).toEqual({
      p1: 3, p2: 3, p3: 2, p4: 2,
    });
  });

  it("accumulates royal-rum points across hands, skipping goal-completing hands (0 points)", () => {
    const s = session(twoPlayers);
    const rounds = [
      { points: { p1: 0, p2: 30 } }, // p1 completed a goal
      { points: { p1: 15, p2: 0 } }, // p2 completed a goal
      { points: { p1: 8, p2: 12 } },
    ];
    expect(recomputeTotals("royal-rum", s, rounds)).toEqual({ p1: 23, p2: 42 });
  });

  it("keeps a player who never appears in any round at their initial total", () => {
    const s = session(fourPlayers.slice(0, 3)); // p1, p2, p3 — p3 sits out every round below
    const rounds = [{ scores: { p1: 5, p2: 5 } }];
    expect(recomputeTotals("flip7", s, rounds)).toEqual({ p1: 5, p2: 5, p3: 0 });
  });

  it("returns the untouched initial totals for an empty rounds array", () => {
    const s = session(twoPlayers, { startingScore: 15 });
    expect(recomputeTotals("euchre-3p", s, [])).toEqual({ p1: 15, p2: 15 });
  });
});
