import { describe, it, expect } from "vitest";
import { computeWrapped, sessionsInYear } from "./wrapped";
import { wrappedYear } from "./wrappedGate";

const ts = (iso) => ({ toDate: () => new Date(iso) });
const players = [
  { id: "a", name: "Alice", active: true },
  { id: "b", name: "Bob", active: true },
  { id: "c", name: "Cy", active: true },
];
function g(id, type, ids, winners, iso) {
  return { id, gameType: type, config: {}, players: ids.map((i) => ({ id: i, name: i })), winnerIds: winners, totals: {}, rounds: [], completedAt: ts(iso) };
}
const sessions = [
  g("old", "flip7", ["a", "b"], ["a"], "2025-06-01T12:00:00"),
  g("1", "flip7", ["a", "b", "c"], ["a"], "2026-02-10T12:00:00"),
  g("2", "flip7", ["a", "b"], ["a"], "2026-02-11T12:00:00"),
  g("3", "oh-heck", ["a", "b", "c"], ["b"], "2026-03-05T12:00:00"),
  g("4", "flip7", ["a", "c"], ["a"], "2026-03-05T20:00:00"),
];

describe("sessionsInYear", () => {
  it("keeps only that calendar year", () => {
    expect(sessionsInYear(sessions, 2026).length).toBe(4);
    expect(sessionsInYear(sessions, 2025).length).toBe(1);
  });
});

describe("computeWrapped", () => {
  const w = computeWrapped(2026, players, sessions, "a");

  it("summarises the family year", () => {
    expect(w.hasData).toBe(true);
    expect(w.family.games).toBe(4);
    expect(w.family.players).toBe(3);
    expect(w.family.topGames[0]).toEqual({ label: "Flip7", count: 3 });
    expect(w.family.champions.players[0].playerId).toBe("a");
    expect(w.family.champions.value).toBe(3);
    expect(w.family.busiestDay.count).toBe(2);
  });

  it("builds the personal slides for the chosen player only from that year", () => {
    expect(w.me.games).toBe(4);
    expect(w.me.wins).toBe(3);
    expect(w.me.favoriteGame).toEqual({ label: "Flip7", count: 3 });
    expect(w.me.streak).toBe(2); // 1,2 then loss at 3, win at 4
    expect(w.me.companion.player.id).toBe("b");
    expect(w.me.winRank).toBe(1);
  });

  it("only counts badges first earned in the year", () => {
    // first-win was earned in 2025 (game "old"), so it isn't new in 2026
    expect(w.me.newBadges.find((b) => b.id === "first-win")).toBeUndefined();
    const bob = computeWrapped(2026, players, sessions, "b");
    expect(bob.me.newBadges.find((b) => b.id === "first-win")).toBeDefined();
  });

  it("has no personal section for someone who didn't play, and tolerates an empty year", () => {
    expect(computeWrapped(2026, [...players, { id: "z", name: "Z", active: true }], sessions, "z").me).toBeNull();
    const empty = computeWrapped(2030, players, sessions, "a");
    expect(empty.hasData).toBe(false);
    expect(empty.me).toBeNull();
  });
});

describe("wrappedYear (Dec 25 gate)", () => {
  it("is hidden before Dec 25", () => {
    expect(wrappedYear(new Date(2026, 11, 24))).toBeNull();
    expect(wrappedYear(new Date(2026, 5, 1))).toBeNull();
  });
  it("opens Dec 25 and stays through January, covering the year just ended", () => {
    expect(wrappedYear(new Date(2026, 11, 25))).toBe(2026);
    expect(wrappedYear(new Date(2026, 11, 31))).toBe(2026);
    expect(wrappedYear(new Date(2027, 0, 10))).toBe(2026);
    expect(wrappedYear(new Date(2027, 1, 1))).toBeNull();
  });
});
