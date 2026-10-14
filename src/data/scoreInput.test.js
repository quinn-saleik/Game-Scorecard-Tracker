import { describe, it, expect } from "vitest";
import { signedValue, toggleSign, isNegative } from "./scoreInput";

describe("scoreInput", () => {
  it("treats empty / garbage as 0", () => {
    expect(signedValue("", false)).toBe(0);
    expect(signedValue(undefined, true)).toBe(0);
    expect(signedValue("abc", false)).toBe(0);
  });

  it("applies the ± flag to typed digits", () => {
    expect(signedValue("5", false)).toBe(5);
    expect(signedValue("5", true)).toBe(-5);
  });

  it("never double-negates a literal minus plus the flag", () => {
    expect(signedValue("-5", true)).toBe(-5);
    expect(signedValue("-5", false)).toBe(-5);
  });

  it("toggles positive -> negative and back, including when empty", () => {
    let s = toggleSign("12", false);
    expect(s).toEqual({ raw: "12", neg: true });
    expect(signedValue(s.raw, s.neg)).toBe(-12);
    s = toggleSign(s.raw, s.neg);
    expect(signedValue(s.raw, s.neg)).toBe(12);
    expect(toggleSign("", false).neg).toBe(true); // tap ± before typing digits
  });

  it("toggling a literally-typed negative flips it positive", () => {
    const s = toggleSign("-7", false);
    expect(s).toEqual({ raw: "7", neg: false });
    expect(isNegative("-7", false)).toBe(true);
  });
});
