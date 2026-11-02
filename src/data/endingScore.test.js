import { describe, it, expect } from "vitest";
import { endingScoreText } from "./endingScore";

describe("endingScoreText", () => {
  it("Sky-Jo: counts up from 0 to 100 but lowest wins", () => {
    expect(endingScoreText("down", "0", "100")).toBe("The game ends once someone's total reaches 100 — lowest score wins.");
  });
  it("race to a high score", () => {
    expect(endingScoreText("up", 0, 500)).toBe("The game ends once someone's total reaches 500 — highest score wins.");
  });
  it("counting down from a starting score", () => {
    expect(endingScoreText("down", "500", "0")).toBe("The game ends once someone's total drops to 0 or below — lowest score wins.");
  });
  it("is null with no ending score", () => {
    expect(endingScoreText("up", "0", "")).toBeNull();
    expect(endingScoreText("up", "0", "  ")).toBeNull();
  });
});
