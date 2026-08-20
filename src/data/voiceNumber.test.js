import { describe, it, expect } from "vitest";
import { parseSpokenNumber } from "./voiceNumber";

describe("parseSpokenNumber", () => {
  it("returns null for empty/missing input", () => {
    expect(parseSpokenNumber("")).toBeNull();
    expect(parseSpokenNumber(null)).toBeNull();
    expect(parseSpokenNumber(undefined)).toBeNull();
  });

  it("prefers literal digits when the transcript already contains them", () => {
    expect(parseSpokenNumber("15")).toBe(15);
    expect(parseSpokenNumber("that's 42 points")).toBe(42);
    expect(parseSpokenNumber("-7")).toBe(-7);
  });

  it("parses basic number words (0-19)", () => {
    expect(parseSpokenNumber("seven")).toBe(7);
    expect(parseSpokenNumber("zero")).toBe(0);
    expect(parseSpokenNumber("oh")).toBe(0);
    expect(parseSpokenNumber("nineteen")).toBe(19);
  });

  it("parses tens + ones combos", () => {
    expect(parseSpokenNumber("twenty")).toBe(20);
    expect(parseSpokenNumber("twenty five")).toBe(25);
    expect(parseSpokenNumber("ninety nine")).toBe(99);
  });

  it("parses hundreds", () => {
    expect(parseSpokenNumber("one hundred")).toBe(100);
    expect(parseSpokenNumber("two hundred fifty")).toBe(250);
  });

  it("handles negative phrasing", () => {
    expect(parseSpokenNumber("minus seven")).toBe(-7);
    expect(parseSpokenNumber("negative twenty five")).toBe(-25);
  });

  it("strips filler words that don't affect the value", () => {
    expect(parseSpokenNumber("twenty five points")).toBe(25);
    expect(parseSpokenNumber("a twenty and five")).toBe(25);
  });

  it("returns null when nothing recognizable is said", () => {
    expect(parseSpokenNumber("uh what")).toBeNull();
    expect(parseSpokenNumber("minus")).toBeNull(); // filler only, no magnitude
  });

  it("is case-insensitive", () => {
    expect(parseSpokenNumber("TWENTY FIVE")).toBe(25);
  });
});
