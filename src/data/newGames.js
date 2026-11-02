// Recently added games get a "NEW" corner ribbon on Home and sit at the top of
// the grid for a while, whether or not they're starred, so people notice them.
// Key = the Home tile key (built-in games use their label; custom/built-in
// custom games use `custom-<slug of the name>`). Value = the day it was added.
// Add a line when a game ships; the ribbon retires itself after NEW_DAYS.
export const NEW_GAMES = {
  "custom-sequence": "2026-11-02",
  "custom-bananagrams": "2026-11-02",
  "custom-taco-cat-goat-cheese-pizza": "2026-11-02",
};
export const NEW_DAYS = 30;

const DAY_MS = 86400000;

export function isNewGame(key, now = new Date()) {
  const added = NEW_GAMES[key];
  if (!added) return false;
  const age = now.getTime() - new Date(`${added}T00:00:00`).getTime();
  return age >= 0 && age < NEW_DAYS * DAY_MS;
}

// Order tiles with the new ones first (in NEW_GAMES order); the rest keep theirs.
export function newFirst(tiles, now = new Date()) {
  const fresh = tiles.filter((t) => isNewGame(t.key, now));
  const order = Object.keys(NEW_GAMES);
  fresh.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  return { fresh, rest: tiles.filter((t) => !isNewGame(t.key, now)) };
}
