// What's-new entries, newest first, written for the people playing — not
// for developers. Add a new object at the TOP of this list whenever a batch
// ships; `id` must be unique and is what the "NEW" dot compares against.
export const CHANGELOG = [
  {
    id: "2026-10-light-dark-fixes",
    date: "2026-10-14",
    title: "Light and dark mode fixes, new icons",
    summary: "Light/dark polish, new icons, new look, tidier bars, Phase 10 dealer, negative scores.",
    items: [
      "Buttons and text that were hard or impossible to see are fixed: the buttons at the bottom of the Me page in light mode, and player names and the ✕ buttons in dark mode.",
      "The settings and \"Who are you?\" pop-ups read clearly in both modes.",
      "Delete and NEW badges keep the same red with white text in both modes.",
      "Locked achievements are easier to read.",
      "New icons: Euchre is now a Jack and Royal Rum a crown.",
      "Custom games (like King's Corner) can change their icon: open the game, tap Edit rules, pick an icon, and Save changes.",
    ],
  },
  {
    id: "2026-10-header-and-dock",
    date: "2026-10-14",
    title: "Tidier top and bottom bars",
    summary: "New look, tidier bars, Phase 10 dealer, negative scores.",
    items: [
      "The app icon now sits right next to the name, and your player shows as a round avatar instead of a wide button. Tap it to switch players.",
      "The bottom bar floats like a card, with a yellow dot on the page you're on.",
      "Headings use a lighter weight so they're easier to read.",
      "Bigger screens get a wider layout, so the games grid and bottom bar don't stretch edge to edge.",
    ],
  },
  {
    id: "2026-10-arcade-pop",
    date: "2026-10-14",
    title: "A fresh look",
    summary: "New look, same games.",
    items: [
      "A brighter \"Arcade Pop\" style: midnight blue, electric yellow, and chunky outlined buttons and cards.",
      "Game tiles are color-coded. Card games use the four suit colors (♠ ♥ ♦ ♣); party games, deduction games, and your own custom games each get their own color.",
      "Games nobody plays much tuck into a \"More games\" button at the bottom of the home screen, and pop back up automatically when you start playing them again.",
      "The app icon got a matching refresh — still the spade and heart you know. To see it on your phone, remove the app from your home screen and add it again.",
    ],
  },
  {
    id: "2026-10-dealer-and-negatives",
    date: "2026-10-14",
    title: "Phase 10 dealer + negative scores",
    summary: "Know who's dealing, and score below zero.",
    items: [
      "Phase 10: tap players in seating order. The first player picked deals first and the deal passes around the table each hand (look for the 🃏).",
      "Custom games (like Sky-Jo) have a ± button next to every score box, so a negative score is a single tap.",
    ],
  },
  {
    id: "2026-09-today-yesterday",
    date: "2026-09-24",
    title: "Fixed \"Today\" and \"Yesterday\"",
    summary: "Date labels now read correctly.",
    items: [
      "A game played just before midnight no longer says \"Today\" a few minutes after midnight.",
    ],
  },
  {
    id: "2026-09-groups",
    date: "2026-09",
    title: "Groups, the Me tab, and Who am I?",
    summary: "Keep Family and Friends nights separate.",
    items: [
      "Groups are friend circles inside the one shared app. There are two to start: Worthington Family and Nashville Friends. Create more any time from the Me tab.",
      "You can be in more than one group. Tap a group on the Me tab to join or leave it.",
      "Game setup, Stats, and the Hall of Fame show the people in your groups, so the player list stays short and relevant.",
      "Pick who you are once (the \"Who are you?\" button at the top) and your phone remembers. You're pre-selected when you start a game and listed first in Stats.",
      "The new Me tab shows your own stats and lets you change your name, color, and icon.",
    ],
    examplesTitle: "Why groups are useful",
    examples: [
      { label: "Family game night", text: "Only family shows up when you pick players — no scrolling past friends from Nashville to find Grandpa." },
      { label: "Weekend with friends", text: "Start a game and your friends are right there, without the family clutter. Their games feed the same stats and Hall of Fame." },
      { label: "In both crews", text: "Belong to both groups and you see both rosters together, so a mixed game night just works." },
      { label: "Adding someone new", text: "When you add a player while you're in a group, they're added to that group automatically." },
      { label: "Tidy, not locked", text: "Groups are just a filter to keep things clean. Nobody is locked out, and a game you're in the middle of always stays on your home screen." },
    ],
  },
];

// Older highlights, undated on purpose (exact dates weren't recorded).
export const EARLIER = [
  {
    id: "earlier-edit-winner",
    title: "Fix a wrong winner",
    summary: "Change a winner afterward.",
    items: [
      "Open the game from Stats and tap ✎ Edit winner.",
      "Custom games jump straight to the \"who won?\" screen when someone hits the target score.",
    ],
  },
  {
    id: "earlier-tv-mode",
    title: "TV mode",
    summary: "Scoreboard on the big screen.",
    items: [
      "TV mode is on the scoring screen of every game, including Euchre 3-player, Phase 10, Royal Rum, 31, and Secret Hitler.",
      "Long names and double-digit scores shrink to fit instead of getting cut off.",
    ],
  },
  {
    id: "earlier-recap-and-fame",
    title: "Recap cards, achievements, and the Hall of Fame",
    summary: "Share and celebrate wins.",
    items: [
      "After a game, make a shareable recap card with the final scores to drop into the group chat.",
      "Achievement badges and Hall of Fame records track streaks, comebacks, and bragging rights.",
    ],
  },
  {
    id: "earlier-new-games",
    title: "More games",
    summary: "Seven new games, plus your own.",
    items: [
      "Plus Catchphrase, 31, Royal Rum, Golf, and several Euchre variations.",
      "Can't find your game? Make your own from the New game tile — it's saved for everyone.",
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
