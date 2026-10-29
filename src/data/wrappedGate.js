// When "Scorecard Wrapped" is visible. It opens on Dec 25 and covers that
// calendar year; it stays open through January for people who missed it
// (still showing the year just ended). Any other time it's hidden — except
// via the unlinked /wrapped/preview route used to test it early.
export const WRAPPED_START_MONTH = 11; // December (0-indexed)
export const WRAPPED_START_DAY = 25;

// The year to wrap right now, or null when it isn't time yet.
export function wrappedYear(now = new Date()) {
  const m = now.getMonth();
  const d = now.getDate();
  if (m === WRAPPED_START_MONTH && d >= WRAPPED_START_DAY) return now.getFullYear();
  if (m === 0) return now.getFullYear() - 1;
  return null;
}
