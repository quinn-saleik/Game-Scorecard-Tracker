// Which game tiles stay on the main Home grid and which fold into "More".
//
// The rule is deliberately simple and explainable, and it adapts as play
// history grows (nothing is hand-curated):
//
//  1. Not enough history yet (fewer than MIN_TOTAL_PLAYS finished games
//     across everything) -> nothing folds. A new install or a fresh batch
//     of games shouldn't hide anything on a guess.
//  2. Otherwise a game stays on the main grid if ANY of these hold:
//       - it has at least `max(MIN_PLAYS_FLOOR, 3% of all plays)` finished
//         games (so the bar rises as the family plays more overall),
//       - it was played within the last RECENT_DAYS (a new favorite
//         shouldn't be buried just because its all-time count is small),
//       - it's one of the top MIN_VISIBLE most-played (the grid never
//         collapses down to a handful of tiles).
//  3. Everything else folds into "More", still most-played first, one tap
//     away. It un-folds on its own the moment play picks back up.
export const MIN_TOTAL_PLAYS = 20;
export const MIN_SHARE = 0.03;
export const MIN_PLAYS_FLOOR = 3;
export const RECENT_DAYS = 30;
export const MIN_VISIBLE = 8;

const DAY_MS = 86400000;

// tiles: [{ playCount: number, lastPlayedAt: Date|null, ...anything }],
// already sorted most-played first. Returns { main, more }, order kept.
export function splitTiles(tiles, now = new Date()) {
  const totalPlays = tiles.reduce((sum, t) => sum + (t.playCount || 0), 0);
  if (totalPlays < MIN_TOTAL_PLAYS) return { main: tiles, more: [] };

  const bar = Math.max(MIN_PLAYS_FLOOR, Math.ceil(totalPlays * MIN_SHARE));
  const recentCutoff = now.getTime() - RECENT_DAYS * DAY_MS;

  const main = [];
  const more = [];
  tiles.forEach((t, i) => {
    const recent = t.lastPlayedAt && t.lastPlayedAt.getTime() >= recentCutoff;
    const keep = (t.playCount || 0) >= bar || recent || i < MIN_VISIBLE;
    (keep ? main : more).push(t);
  });
  return { main, more };
}
