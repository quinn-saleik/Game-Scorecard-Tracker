import { describe, it, expect } from "vitest";
import { presetFavoriteKeys, resolveFavoriteKeys, splitByFavorites, toggleFavoriteKey, PRESET_SIZE, PRESET_MIN } from "./gameFavorites";

const tiles = ["a", "b", "c", "d", "e", "f", "g", "h", "i"].map((k) => ({ key: k })); // family order a..i

describe("presetFavoriteKeys", () => {
  it("is the person's own most-played games, most first, capped", () => {
    const counts = { i: 9, h: 8, g: 7, f: 6, e: 5, d: 4, c: 3, b: 2, a: 1 };
    expect(presetFavoriteKeys(tiles, counts)).toEqual(["i", "h", "g", "f", "e", "d"]);
    expect(presetFavoriteKeys(tiles, counts)).toHaveLength(PRESET_SIZE);
  });
  it("ignores games they've never played", () => {
    expect(presetFavoriteKeys(tiles, { e: 3, b: 1, c: 2, d: 4, h: 5 })).toEqual(["h", "d", "e", "c", "b"]);
  });
  it("tops up from the family's order when someone has played little", () => {
    expect(presetFavoriteKeys(tiles, { g: 2 })).toEqual(["g", "a", "b", "c"]);
    expect(presetFavoriteKeys(tiles, {})).toEqual(["a", "b", "c", "d"]);
    expect(presetFavoriteKeys(tiles, {})).toHaveLength(PRESET_MIN);
  });
  it("copes with fewer tiles than the minimum", () => {
    expect(presetFavoriteKeys(tiles.slice(0, 2), {})).toEqual(["a", "b"]);
  });
});

describe("resolveFavoriteKeys", () => {
  it("uses the preset until a list has been saved", () => {
    expect(resolveFavoriteKeys(tiles, undefined, { c: 5 })).toEqual(["c", "a", "b", "d"]);
    expect(resolveFavoriteKeys(tiles, null, {})).toEqual(["a", "b", "c", "d"]);
  });
  it("uses a saved list as-is, dropping games that no longer exist", () => {
    expect(resolveFavoriteKeys(tiles, ["e", "zzz", "a"], { c: 5 })).toEqual(["e", "a"]);
  });
  it("respects a saved empty list (starred nothing)", () => {
    expect(resolveFavoriteKeys(tiles, [], { c: 5 })).toEqual([]);
  });
});

describe("splitByFavorites / toggleFavoriteKey", () => {
  it("splits in tile order", () => {
    const { main, more } = splitByFavorites(tiles, ["c", "a"]);
    expect(main.map((t) => t.key)).toEqual(["a", "c"]);
    expect(more.map((t) => t.key)).toEqual(["b", "d", "e", "f", "g", "h", "i"]);
  });
  it("toggles a key on and off", () => {
    expect(toggleFavoriteKey(["a"], "b")).toEqual(["a", "b"]);
    expect(toggleFavoriteKey(["a", "b"], "a")).toEqual(["b"]);
  });
});
