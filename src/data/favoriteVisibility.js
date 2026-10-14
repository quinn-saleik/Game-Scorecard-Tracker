// Favorites-based visibility — "cleaner UI for limited player options,"
// never a hard lock. Each player doc can carry `favoriteIds` (who they
// usually play with). Your "circle" is you plus your active favorites.
//
// The circle only filters when ALL of these hold; otherwise everyone shows:
//   - you've picked who you are (data/whoami.js),
//   - you have at least one favorite that's still an active player,
//   - "Show everyone" (data/viewScope.js) is off.
// That makes every failure mode fail open: no whoami, empty/missing/stale
// favorites, or a one-tap toggle all land on "show all active players".
import { useMemo } from "react";
import { useWhoamiId } from "./whoami";
import { useShowEveryone } from "./viewScope";

// The set of player ids in your circle, or null when no filtering applies
// by data alone (the toggle is handled separately so UI can still offer it).
export function getCircle(players, whoamiId) {
  const me = players.find((p) => p.id === whoamiId);
  if (!me) return null;
  const activeIds = new Set(players.filter((p) => p.active).map((p) => p.id));
  const favs = (me.favoriteIds || []).filter((id) => id !== me.id && activeIds.has(id));
  if (favs.length === 0) return null;
  return new Set([me.id, ...favs]);
}

// Active players, narrowed to the circle unless showAll or no circle.
export function visiblePlayers(players, whoamiId, showAll = false) {
  const active = players.filter((p) => p.active);
  const circle = getCircle(players, whoamiId);
  if (!circle || showAll) return active;
  return active.filter((p) => circle.has(p.id));
}

// Is a player in scope (any player, active or not — used for stats rows)?
export function inScopeFn(players, whoamiId, showAll = false) {
  const circle = getCircle(players, whoamiId);
  if (!circle || showAll) return () => true;
  return (playerId) => circle.has(playerId);
}

// A completed game is in scope if you or any of your favorites played in it.
export function sessionInScopeFn(players, whoamiId, showAll = false) {
  const circle = getCircle(players, whoamiId);
  if (!circle || showAll) return () => true;
  return (session) => (session.players || []).some((sp) => circle.has(sp.id));
}

export function useVisiblePlayers(players) {
  const whoamiId = useWhoamiId();
  const [showAll] = useShowEveryone();
  return useMemo(() => visiblePlayers(players, whoamiId, showAll), [players, whoamiId, showAll]);
}

export function useInScope(players) {
  const whoamiId = useWhoamiId();
  const [showAll] = useShowEveryone();
  return useMemo(() => inScopeFn(players, whoamiId, showAll), [players, whoamiId, showAll]);
}

export function useSessionFilter(players) {
  const whoamiId = useWhoamiId();
  const [showAll] = useShowEveryone();
  return useMemo(() => sessionInScopeFn(players, whoamiId, showAll), [players, whoamiId, showAll]);
}

// How many favorites are active — for the toggle's label. 0 = toggle hidden.
export function circleSize(players, whoamiId) {
  const circle = getCircle(players, whoamiId);
  return circle ? circle.size - 1 : 0;
}
