import { describe, it, expect } from "vitest";
import { computeRivalry } from "./rivalry";

const ts = (iso) => ({ toDate: () => new Date(iso) });
function game(id, gameType, ids, winnerIds, day) {
  return {
    id,
    gameType,
    config: {},
    players: ids.map((i) => ({ id: i, name: i })),
    winnerIds,
    completedAt: ts(`2026-03-${String(day).padStart(2, "0")}`),
  };
}

describe("computeRivalry", () => {
  const sessions = [
    game("g1", "flip7", ["a", "b", "c"], ["a"], 1),
    game("g2", "flip7", ["a", "b"], ["b"], 2),
    game("g3", "euchre-traditional", ["a", "b", "c", "d"], ["a", "b"], 3), // partners
    game("g4", "flip7", ["a", "b", "c"], ["c"], 4), // someone else
    game("g5", "flip7", ["a", "c"], ["a"], 5), // b not there
  ];

  it("returns null for the same player or a missing one", () => {
    expect(computeRivalry("a", "a", sessions)).toBeNull();
    expect(computeRivalry("a", null, sessions)).toBeNull();
  });

  it("counts only games both played and splits the four outcomes", () => {
    const r = computeRivalry("a", "b", sessions);
    expect(r.games).toBe(4);
    expect(r.a).toBe(1);
    expect(r.b).toBe(1);
    expect(r.both).toBe(1);
    expect(r.neither).toBe(1);
    expect(r.lead).toBe("tie");
  });

  it("is symmetric with the sides swapped", () => {
    const r = computeRivalry("b", "a", sessions);
    expect(r.a).toBe(1);
    expect(r.b).toBe(1);
    expect(r.games).toBe(4);
  });

  it("breaks results down per game, newest recent-first", () => {
    const r = computeRivalry("a", "b", sessions);
    const flip = r.byGame.find((g) => g.label === "Flip7");
    expect(flip.games).toBe(3);
    expect(flip.a).toBe(1);
    expect(r.recent[0].sessionId).toBe("g4");
    expect(r.recent.length).toBe(4);
  });

  it("flags who leads", () => {
    const r = computeRivalry("a", "c", sessions);
    expect(r.lead).toBe("a");
  });

  it("handles a pair that never played together", () => {
    const r = computeRivalry("b", "z", sessions);
    expect(r.games).toBe(0);
    expect(r.byGame).toEqual([]);
    expect(r.firstDate).toBeNull();
  });
});
