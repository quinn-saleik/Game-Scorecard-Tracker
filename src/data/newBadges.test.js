import { describe, it, expect } from "vitest";
import { computeNewBadges, groupBadgesByPlayer } from "./newBadges";

function ts(iso) {
  return { toDate: () => new Date(iso) };
}
const players = [
  { id: "p1", name: "Marsha" },
  { id: "p2", name: "Doug" },
];
function game(id, winner, day) {
  return {
    id,
    gameType: "flip7",
    config: {},
    players: [{ id: "p1", name: "p1" }, { id: "p2", name: "p2" }],
    winnerIds: [winner],
    totals: { p1: winner === "p1" ? 200 : 100, p2: winner === "p2" ? 200 : 100 },
    rounds: [],
    completedAt: ts(`2026-01-0${day}`),
  };
}

describe("computeNewBadges", () => {
  it("returns null until the finished game is in the completed feed", () => {
    const g = game("g1", "p1", 1);
    expect(computeNewBadges(g, players, [])).toBeNull();
  });

  it("announces First Win only for the game that earned it", () => {
    const g1 = game("g1", "p1", 1);
    const g2 = game("g2", "p1", 2);
    const sessions = [g2, g1]; // newest first, like the live feed
    const first = computeNewBadges(g1, players, [g1]);
    expect(first.map((x) => `${x.player.id}:${x.badge.id}`)).toEqual(["p1:first-win"]);
    // second win: nothing new (first-win already held before g2)
    const second = computeNewBadges(g2, players, sessions);
    expect(second.find((x) => x.badge.id === "first-win")).toBeUndefined();
  });

  it("announces the streak badge on the game that completes it, once", () => {
    const gs = [1, 2, 3].map((d) => game(`g${d}`, "p1", d));
    const feed = [...gs].reverse();
    const third = computeNewBadges(gs[2], players, feed);
    expect(third.some((x) => x.badge.id === "hot-streak" && x.player.id === "p1")).toBe(true);
    const second = computeNewBadges(gs[1], players, feed.slice(1));
    expect(second.some((x) => x.badge.id === "hot-streak")).toBe(false);
  });

  it("groups badges by player", () => {
    const grouped = groupBadgesByPlayer([
      { player: { id: "a" }, badge: { id: "x" } },
      { player: { id: "b" }, badge: { id: "y" } },
      { player: { id: "a" }, badge: { id: "z" } },
    ]);
    expect(grouped.map((g) => [g.player.id, g.badges.length])).toEqual([["a", 2], ["b", 1]]);
  });
});
