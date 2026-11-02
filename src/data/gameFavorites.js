// Which game tiles sit on Home's main grid: the ones you've starred. Everything
// else lives in the "More games" dropdown (the "New game" tile is always on the
// main grid — Home adds it itself, it isn't a game here).
//
// Stars are per person (stored on the signed-in player as `favoriteGameIds`,
// or on this device when nobody's signed in). Until someone stars or unstars
// something for the first time they have no saved list, and we show a preset
// instead — their own most-played games — so nobody opens the app to an empty
// grid. The preset isn't saved: it keeps following their play history until
// their first tap, which saves the whole list (preset included).
//
// A "tile" is anything with a unique `key`; tiles arrive most-played-first
// (family-wide) so ties and the top-up below follow that order.
export const PRESET_SIZE = 6; // most-played games to star by default
export const PRESET_MIN = 4; // top up with the family's favorites below this

// personalCounts: { [tileKey]: finished games this person played }
export function presetFavoriteKeys(tiles, personalCounts = {}) {
  const mine = tiles
    .filter((t) => (personalCounts[t.key] || 0) > 0)
    .sort((a, b) => personalCounts[b.key] - personalCounts[a.key]); // stable
  const out = mine.slice(0, PRESET_SIZE).map((t) => t.key);
  for (const t of tiles) {
    if (out.length >= PRESET_MIN) break;
    if (!out.includes(t.key)) out.push(t.key);
  }
  return out;
}

// stored: the saved array of keys, or undefined/null if never customized.
// An empty saved array is respected — it means "I starred nothing".
export function resolveFavoriteKeys(tiles, stored, personalCounts = {}) {
  if (Array.isArray(stored)) {
    const known = new Set(tiles.map((t) => t.key));
    return stored.filter((k) => known.has(k));
  }
  return presetFavoriteKeys(tiles, personalCounts);
}

export function splitByFavorites(tiles, favoriteKeys) {
  const fav = new Set(favoriteKeys);
  return { main: tiles.filter((t) => fav.has(t.key)), more: tiles.filter((t) => !fav.has(t.key)) };
}

export function toggleFavoriteKey(favoriteKeys, key) {
  return favoriteKeys.includes(key) ? favoriteKeys.filter((k) => k !== key) : [...favoriteKeys, key];
}
