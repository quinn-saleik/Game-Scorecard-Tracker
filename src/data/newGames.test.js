import { describe, it, expect } from "vitest";
import { isNewGame, newFirst, NEW_DAYS } from "./newGames";

const day = (iso) => new Date(`${iso}T12:00:00`);

describe("isNewGame", () => {
  it("is true from the day a game is added until NEW_DAYS later", () => {
    expect(isNewGame("custom-bananagrams", day("2026-11-02"))).toBe(true);
    expect(isNewGame("custom-bananagrams", day("2026-11-30"))).toBe(true);
    expect(isNewGame("custom-bananagrams", day("2026-12-05"))).toBe(false);
    expect(NEW_DAYS).toBe(30);
  });
  it("is false for unlisted games and before the release date", () => {
    expect(isNewGame("Flip7", day("2026-11-05"))).toBe(false);
    expect(isNewGame("custom-bananagrams", day("2026-10-01"))).toBe(false);
  });
});

describe("newFirst", () => {
  it("splits new tiles out, in listed order, leaving the rest in place", () => {
    const tiles = ["Flip7", "custom-taco-cat", "Euchre", "custom-sequence"].map((key) => ({ key }));
    const { fresh, rest } = newFirst(tiles, day("2026-11-10"));
    expect(fresh.map((t) => t.key)).toEqual(["custom-sequence", "custom-taco-cat"]);
    expect(rest.map((t) => t.key)).toEqual(["Flip7", "Euchre"]);
  });
});
