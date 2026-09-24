import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatLastPlayed } from "./format";

// Regression coverage for the real bug: formatLastPlayed used to bucket by
// raw elapsed milliseconds (`(now - date) / 86400000`), not actual
// calendar days. A game played late at night and checked again a few
// minutes later, but after midnight, would misreport — "Today" when it
// was already yesterday, calendar-wise (or vice versa depending on exactly
// when you looked). This is a device-LOCAL comparison on purpose — dates
// should read according to whatever timezone the viewing device is set
// to, same as before, just comparing real calendar days instead of a
// rolling 24h window. This test environment's local zone is UTC, so these
// dates are plain UTC instants standing in for "local".
describe("formatLastPlayed", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns — for no date", () => {
    expect(formatLastPlayed(null)).toBe("—");
  });

  it("says 'Yesterday' for a game just after midnight, even though barely any time has passed", () => {
    // Old rolling-window logic: floor(20min / 24h) = 0 -> "Today" (wrong,
    // it's already a new calendar day).
    const gameTime = new Date("2026-09-23T23:50:00Z");
    vi.setSystemTime(new Date("2026-09-24T00:10:00Z"));
    expect(formatLastPlayed(gameTime)).toBe("Yesterday");
  });

  it("stays 'Today' for a game earlier the same calendar day, even many hours later", () => {
    const gameTime = new Date("2026-09-24T01:00:00Z");
    vi.setSystemTime(new Date("2026-09-24T23:00:00Z"));
    expect(formatLastPlayed(gameTime)).toBe("Today");
  });

  it("counts whole calendar days for anything under 2 weeks", () => {
    const gameTime = new Date("2026-09-17T20:00:00Z");
    vi.setSystemTime(new Date("2026-09-24T20:00:00Z"));
    expect(formatLastPlayed(gameTime)).toBe("7d ago");
  });
});
