// What's-new entries, newest first, written for the people playing — not
// for developers. Add a new object at the TOP of this list whenever a batch
// ships; `id` must be unique and is what the "NEW" dot compares against.
export const CHANGELOG = [
  {
    id: "2026-10-color-tiles",
    date: "2026-10-15",
    title: "Color-coded game tiles",
    items: [
      "Games nobody plays much now tuck into a \"More games\" section at the bottom, and pop back up automatically when you start playing them again.",
      "Game tiles have a fresh look: each game's icon sits in a color badge. Card games use the four suit colors, party games and your custom games get their own.",
    ],
  },
  {
    id: "2026-10-dealer-and-negatives",
    date: "2026-10-14",
    title: "Phase 10 dealer + negative scores",
    items: [
      "Phase 10 now tracks who's dealing. Tap players in seating order and the deal passes around the table each hand (look for the 🃏).",
      "A ± button next to every score box in custom games (like Sky-Jo) makes entering a negative score a single tap.",
    ],
  },
  {
    id: "2026-09-today-yesterday",
    date: "2026-09-24",
    title: "Fixed \"Today\" and \"Yesterday\"",
    items: [
      "A game played just before midnight no longer says \"Today\" a few minutes after midnight. Dates now follow the calendar on your own phone.",
    ],
  },
  {
    id: "2026-09-me-and-groups",
    date: "2026-09-20",
    title: "Me page, groups, and Who am I?",
    items: [
      "Pick who you are once and your phone remembers — you're pre-selected when you start a game.",
      "The new Me tab shows your own stats and lets you edit your name, color, and icon.",
      "Groups (like Family and Friends) keep the player lists and stats focused on the people you actually play with.",
    ],
  },
  {
    id: "2026-09-edit-winner",
    date: "2026-09-12",
    title: "Fix a wrong winner",
    items: [
      "Tapped the wrong winner? Open the game from Stats and tap ✎ Edit winner.",
      "Custom games now jump straight to the \"who won?\" screen when someone hits the target score.",
    ],
  },
  {
    id: "2026-09-tv-mode",
    date: "2026-09-05",
    title: "TV mode everywhere",
    items: [
      "TV mode is now on the scoring screen of Euchre 3-player, Phase 10, Royal Rum, 31, and Secret Hitler.",
      "Long names and double-digit scores shrink to fit the big screen instead of getting cut off.",
    ],
  },
];

export const LATEST_CHANGELOG_ID = CHANGELOG[0].id;

const STORAGE_KEY = "scorecard-whatsnew-seen";

// Per-device, like the tour flag — "have I looked at the latest update yet".
export function getSeenChangelogId() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function markChangelogSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, LATEST_CHANGELOG_ID);
  } catch {
    // Not persisted (private browsing etc.) — the dot just shows again.
  }
}

export function hasUnseenChangelog() {
  return getSeenChangelogId() !== LATEST_CHANGELOG_ID;
}
