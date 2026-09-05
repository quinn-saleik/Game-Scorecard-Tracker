import { describe, it, expect, vi } from "vitest";

// computeShortName is a pure function, but importing the module also pulls
// in the live subscribeToPlayers() wiring for shortName() (see
// playerNames.js), which in turn touches ../firebase — real Firebase init
// that needs env vars this test run doesn't set. Mock that one import out
// so this test exercises only the pure logic under test.
vi.mock("./players", () => ({ subscribeToPlayers: () => () => {} }));

const { computeShortName } = await import("./playerNames");

// Fixture builder: firstName/lastName style (the normal shape) unless a
// bare `name` is passed, to also cover the legacy single-field fallback.
function player(id, firstName, lastName) {
  return { id, firstName, lastName };
}

describe("computeShortName", () => {
  it("shows first name only when no one else shares it", () => {
    const roster = [player("1", "Marsha", "Worthington"), player("2", "Doug", "Worthington")];
    expect(computeShortName(roster[0], roster)).toBe("Marsha");
    expect(computeShortName(roster[1], roster)).toBe("Doug");
  });

  it("adds a last initial when two players share a first name", () => {
    const roster = [
      player("1", "Sarah", "Taylor"),
      player("2", "Sarah", "Jones"),
    ];
    expect(computeShortName(roster[0], roster)).toBe("Sarah T.");
    expect(computeShortName(roster[1], roster)).toBe("Sarah J.");
  });

  it("grows past one initial when the last initial also collides", () => {
    const roster = [
      player("1", "Sarah", "Johnson"),
      player("2", "Sarah", "Jones"),
      player("3", "Sarah", "Taylor"),
    ];
    // Johnson vs Jones share "J" but diverge at the 2nd letter (o vs o...
    // wait, "Johnson" and "Jones" both start "Jo" too - diverge at 3rd: h vs n).
    expect(computeShortName(roster[0], roster)).toBe("Sarah Joh.");
    expect(computeShortName(roster[1], roster)).toBe("Sarah Jon.");
    // Taylor doesn't collide with either at 1 letter, stays short.
    expect(computeShortName(roster[2], roster)).toBe("Sarah T.");
  });

  it("falls back to the full last name if it's the only way to stay unique", () => {
    const roster = [player("1", "Sam", "Lee"), player("2", "Sam", "Leon")];
    // "Lee" vs "Leon": L/L, Le/Le, Lee/Leo -> Lee's full 3 letters ("Lee")
    // never collides with Leon's first 3 ("Leo"), so it resolves at len 3.
    expect(computeShortName(roster[0], roster)).toBe("Sam Lee");
    expect(computeShortName(roster[1], roster)).toBe("Sam Leo.");
  });

  it("shows first name only when a same-first-name player has no last name to disambiguate with", () => {
    const roster = [player("1", "Sarah", "Taylor"), { id: "2", firstName: "Sarah" }];
    expect(computeShortName(roster[0], roster)).toBe("Sarah T.");
    expect(computeShortName(roster[1], roster)).toBe("Sarah");
  });

  it("includes the player itself even if missing from the passed-in roster", () => {
    const other = player("1", "Sarah", "Taylor");
    const self = player("2", "Sarah", "Jones");
    expect(computeShortName(self, [other])).toBe("Sarah J.");
  });

  it("falls back to splitting a legacy combined `name` field", () => {
    const roster = [{ id: "1", name: "Riley Smith" }, { id: "2", name: "Riley Chen" }];
    expect(computeShortName(roster[0], roster)).toBe("Riley S.");
    expect(computeShortName(roster[1], roster)).toBe("Riley C.");
  });

  it("returns a single-word legacy name as-is", () => {
    expect(computeShortName({ id: "1", name: "Cher" }, [{ id: "1", name: "Cher" }])).toBe("Cher");
  });

  it("returns empty string for a null/undefined player", () => {
    expect(computeShortName(null, [])).toBe("");
    expect(computeShortName(undefined, [])).toBe("");
  });
});
