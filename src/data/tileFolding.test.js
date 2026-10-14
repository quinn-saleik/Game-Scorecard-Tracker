import { describe, it, expect } from "vitest";
import { splitTiles, MIN_VISIBLE } from "./tileFolding";

const NOW = new Date("2026-10-15T12:00:00Z");
const daysAgo = (n) => new Date(NOW.getTime() - n * 86400000);
const tile = (name, playCount, lastDays = 200) => ({
  name,
  playCount,
  lastPlayedAt: playCount ? daysAgo(lastDays) : null,
});
// 14 games, already sorted most-played first like Home does.
const many = (overrides = {}) =>
  [
    tile("a", 60), tile("b", 40), tile("c", 30), tile("d", 20), tile("e", 15),
    tile("f", 12), tile("g", 10), tile("h", 8), tile("i", 4), tile("j", 2),
    tile("k", 1), tile("l", 0), tile("m", 0), tile("n", 0),
  ].map((t) => (overrides[t.name] ? { ...t, ...overrides[t.name] } : t));

describe("splitTiles", () => {
  it("folds nothing when there isn't enough play history yet", () => {
    const tiles = [tile("a", 5), tile("b", 3), tile("c", 0), tile("d", 0)];
    const { main, more } = splitTiles(tiles, NOW);
    expect(main).toHaveLength(4);
    expect(more).toHaveLength(0);
  });

  it("folds rarely-played games once there's enough history", () => {
    const { main, more } = splitTiles(many(), NOW);
    // total 202 -> bar = max(3, ceil(6.06)) = 7; top 8 always stay.
    expect(main.map((t) => t.name)).toEqual(["a", "b", "c", "d", "e", "f", "g", "h"]);
    expect(more.map((t) => t.name)).toEqual(["i", "j", "k", "l", "m", "n"]);
  });

  it("keeps a recently played game out of More even with few plays", () => {
    const { main, more } = splitTiles(many({ j: { lastPlayedAt: daysAgo(3) } }), NOW);
    expect(main.map((t) => t.name)).toContain("j");
    expect(more.map((t) => t.name)).not.toContain("j");
  });

  it("always leaves at least MIN_VISIBLE tiles on the main grid", () => {
    const flat = Array.from({ length: 12 }, (_, i) => tile(`g${i}`, 2));
    // total 24 >= 20 but nobody clears the bar and nothing is recent
    const { main } = splitTiles(flat, NOW);
    expect(main).toHaveLength(MIN_VISIBLE);
  });

  it("keeps order within each group", () => {
    const { more } = splitTiles(many(), NOW);
    const counts = more.map((t) => t.playCount);
    expect([...counts].sort((a, b) => b - a)).toEqual(counts);
  });
});
