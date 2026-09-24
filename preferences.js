// Local device display preferences (theme + text size) — deliberately NOT
// synced through Firestore. Different family members' phones can want
// different settings, and there's no per-device user account to hang a
// synced preference off of, so localStorage is the right tool here (unlike
// game data, this never needs to be shared or backed up).
const STORAGE_KEY = "scorecard-preferences";

const TEXT_SIZES = ["normal", "large", "xlarge"];

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getPreferences() {
  const stored = readStored();
  return {
    theme: stored.theme === "dark" ? "dark" : "light",
    textSize: TEXT_SIZES.includes(stored.textSize) ? stored.textSize : "normal",
  };
}

export function savePreferences(prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Storage unavailable (private browsing, quota, etc.) — preferences
    // just won't persist across reloads; not worth surfacing an error for.
  }
}

// Applies the given preferences to the document immediately. Call on
// startup (before first paint, to avoid a flash of the wrong theme) and
// again whenever the user changes a setting.
export function applyPreferences(prefs) {
  const html = document.documentElement;
  html.classList.toggle("dark", prefs.theme === "dark");
  html.classList.remove("text-lg", "text-xl");
  if (prefs.textSize === "large") html.classList.add("text-lg");
  if (prefs.textSize === "xlarge") html.classList.add("text-xl");
}
