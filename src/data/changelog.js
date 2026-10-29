// What's-new entries, newest first, written for the people playing — not
// for developers. Add a new object at the TOP of this list whenever a batch
// ships; `id` must be unique and is what the "NEW" dot compares against.
export const CHANGELOG = [
  {
    id: "2026-10-winner-only",
    date: "2026-10-29",
    title: "Just log who won",
    summary: "13 new achievements, custom games can skip scoring, Most played, Rivalry compare, achievement pop-ups, play-to score, identity tiles, bigger TV mode.",
    items: [
      "Me tab cleanup: the Me icon is now a star, Favorites is a tile in Identity (tap for the list), win streaks moved into Overview, and Achievements sits right below it, earned ones first.",
      "Went Alone, Lone Wolf, Nil Streak and Solo Streak achievements are retired, and achievement descriptions are shorter. Sequence Sweep is now 3 wins in a row in Sequence.",
      "13 new achievements: Dominant, Champion, Underdog, Specialist, Master, Globetrotter, Night Owl, Loyal, Nemesis, Streak Breaker, Phase Master, Dealer's Luck and Sequence Sweep. They count your past games too.",
      "Sequence is now a built-in game on the home screen: pick who played, then who won.",
      "Custom games have a new \"Just who won\" option: pick who's playing, then who won. No scores to enter. Great for games like Sequence.",
      "\"Favorite game\" is now called \"Most played\" everywhere.",
    ],
  },
  {
    id: "2026-10-rivalry",
    date: "2026-10-29",
    title: "Rivalry compare",
    summary: "Rivalry compare, achievement pop-ups, par explainer, play-to score, identity tiles, bigger TV mode, feedback pop-up.",
    items: [
      "Stats has a new Rivalry card: pick any two players to see their record against each other, game by game, plus who won together and recent results.",
    ],
  },
  {
    id: "2026-10-achievement-popup",
    date: "2026-10-29",
    title: "Achievement pop-ups",
    summary: "Achievement pop-ups, par explainer on Stats, play-to score, identity tiles, bigger TV mode, feedback pop-up, fairer win %, favorites.",
    items: [
      "When a game finishes and someone earns a new achievement, a pop-up announces it (\"Doug earned 🔥 Hot Streak\"). Tap to dismiss.",
      "The Game over screen also keeps a \"New achievements\" card.",
      "TV mode now switches to a big \"Game over\" screen with the winner and any new achievements when the game ends.",
    ],
  },
  {
    id: "2026-10-par-explainer",
    date: "2026-10-29",
    title: "What is par?",
    summary: "Par explainer on Stats, play-to score, new identity tiles, bigger TV mode, feedback pop-up, fairer win %, favorites, new icons.",
    items: [
      "Stats now has a \"What are par and vs par?\" banner at the top. Tap it for a plain-English explanation of why a win % in a big game isn't the same as one in a 2-player game.",
    ],
  },
  {
    id: "2026-10-identity-tiles",
    date: "2026-10-14",
    title: "Identity tiles",
    summary: "Play-to score, new identity tiles, bigger TV mode, feedback pop-up, fairer win %, favorites, light/dark polish, new icons, new look.",
    items: [
      "Me tab: Color, Avatar and Photo are now three big tiles. Tap one to set or change it, and tap Remove under it to clear it.",
      "When you pick a color someone else already uses, their name shows under it (color name, plus their first name and a last initial if needed).",
      "Feedback now shows who sent it, or Anonymous if no one was signed in.",
      "Sky-Jo and other saved games: a new \"Play to\" box on setup lets you pick the ending score for that game (say 75 instead of 100). It only affects that game, not the saved rules.",
    ],
  },
  {
    id: "2026-10-tv-mode",
    date: "2026-10-14",
    title: "Bigger TV mode",
    summary: "Bigger TV mode, feedback pop-up, fairer win %, favorites, light/dark polish, new icons, new look, tidier bars, Phase 10 dealer, negative scores.",
    items: [
      "TV mode is redone to fill the screen: bigger names and scores, bigger avatars, and a small rank badge (👑 for the leader). With only a couple of players in portrait, the score sits big under the name.",
      "Phase 10 shows each player's phases 1-10: green when done, yellow for the one they're on.",
      "Royal Rum shows each player's goals 6-12, green once done.",
      "Oh Heck shows each player's bid, and what they got once scored.",
      "A yellow 🃏 card on a player's icon marks the dealer in Phase 10 and Oh Heck.",
    ],
  },
  {
    id: "2026-10-feedback-popup",
    date: "2026-10-14",
    title: "Tell me what you think",
    summary: "Feedback pop-up, fairer win %, favorites, light/dark polish, new icons, new look, tidier bars, Phase 10 dealer, negative scores.",
    items: [
      "The feedback box moved: tap \"Tell me what you think!\" under What's new on the home screen and a pop-up opens to type it in. Same place it always went.",
    ],
  },
  {
    id: "2026-10-fair-win-rate",
    date: "2026-10-14",
    title: "Fairer win %",
    summary: "Fairer win %, favorites, light/dark polish, new icons, new look, tidier bars, Phase 10 dealer, negative scores.",
    items: [
      "Stats now shows \"par\" under each win %: the win rate luck alone would give you. A 2-player game is 50% and an 8-player game is 12.5%, so a 16% in big games can beat a 50% in 2-player games.",
      "A new \"vs par\" column divides your wins by par: 1.0× is exactly average, 2.0× is twice as often as luck. Green ▲ means at or above par, red ▼ means below. It shows once you have 5 games.",
      "Me and player pages show par and vs par too.",
      "Hall of Fame: when players tie for a record, everyone tied is shown, not just one of them.",
      "Fixed: the \"Who are you?\" pop-up is wider, shows just names, and scrolls instead of running off the screen.",
    ],
  },
  {
    id: "2026-10-favorites",
    date: "2026-10-14",
    title: "Favorites replace Groups",
    summary: "Favorites, light/dark polish, new icons, new look, tidier bars, Phase 10 dealer, negative scores.",
    items: [
      "Pick your favorite players on the Me tab. Player pickers, Stats, and the Hall of Fame now show just you and your favorites.",
      "Everyone who was in a group with you is already a favorite, so nothing changes until you want it to.",
      "A ⭐ Favorites / 👥 Everyone switch sits above every player list, Stats, and the Hall of Fame. One tap shows everybody, and it remembers on your phone.",
      "Pick no favorites and you see everyone, as before.",
      "When you add a new player, they're added to your favorites (if you have any).",
      "Presetting someone else? Me, then Manage all players, then tap the ⭐ next to their name.",
    ],
    examplesTitle: "Why favorites are useful",
    examples: [
      { label: "Quick game setup", text: "Grandma's list is just the six people she plays with, not the whole roster." },
      { label: "Stats that fit", text: "Stats and the Hall of Fame compare the people you actually play, not everyone who has ever used the app." },
      { label: "Never stuck", text: "A guest who isn't on your list? Tap Everyone, add them to the game, tap Favorites to go back." },
    ],
  },
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
      "New icons: Euchre is now corn (🌽), Oh Heck a target (🎯), and Royal Rum a crown (👑).",
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
    summary: "Later replaced by Favorites.",
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
