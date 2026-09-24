// Whether the guided first-run tour has been shown before, so it only
// auto-opens once per device — same "local, not synced" reasoning as
// preferences.js (theme/text size): this is about a device's own state,
// not something to share across the family. Deliberately separate from
// preferences.js's storage key/shape rather than folding a 3rd field in,
// so a corrupt/missing tour flag can never accidentally reset someone's
// theme or vice versa.
const STORAGE_KEY = "scorecard-tour-seen";

export function hasSeenTour() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // Storage unavailable (private browsing, quota, etc.) — treat as
    // "already seen" so the tour doesn't wedge itself open every load.
    return true;
  }
}

export function markTourSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Won't persist across reloads; not worth surfacing an error for.
  }
}
