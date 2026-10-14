import { describe, it, expect } from "vitest";
import { computeFavoriteMigration } from "./favoritesMigrationLogic";

describe("computeFavoriteMigration", () => {
  const players = [
    { id: "q", groupIds: ["fam", "nash"] },
    { id: "m", groupIds: ["fam"] },
    { id: "s", groupIds: ["nash"] },
    { id: "x", groupIds: ["other"] },
    { id: "new" },
  ];

  it("favorites everyone you shared a group with, never yourself", () => {
    const u = computeFavoriteMigration(players);
    expect(u.q.sort()).toEqual(["m", "s"]);
    expect(u.m).toEqual(["q"]);
    expect(u.s).toEqual(["q"]);
  });

  it("gives a player alone in their group an empty list (still marks them migrated)", () => {
    expect(computeFavoriteMigration(players).x).toEqual([]);
  });

  it("skips players with no groups (they keep seeing everyone)", () => {
    expect("new" in computeFavoriteMigration(players)).toBe(false);
  });

  it("is idempotent: players who already have favoriteIds, even empty, are untouched", () => {
    const done = players.map((p) => (p.id === "q" ? { ...p, favoriteIds: [] } : p));
    expect("q" in computeFavoriteMigration(done)).toBe(false);
  });
});
