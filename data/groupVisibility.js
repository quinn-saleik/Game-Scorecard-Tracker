// Group-aware player visibility — "cleaner UI for limited player options,"
// never a hard lock (see data/groups.js). If you haven't picked who you are
// (data/whoami.js) or your player isn't in any group yet, nothing is
// filtered: every active player shows, same as before groups existed. Once
// you're in a group, screens using this default to showing only players who
// share at least one group with you (plus you, always).
import { useMemo } from "react";
import { useWhoamiId } from "./whoami";

export function useVisiblePlayers(players) {
  const whoamiId = useWhoamiId();
  return useMemo(() => {
    const active = players.filter((p) => p.active);
    const me = players.find((p) => p.id === whoamiId);
    const myGroups = me?.groupIds || [];
    if (!me || myGroups.length === 0) return active;
    return active.filter(
      (p) => p.id === me.id || (p.groupIds || []).some((g) => myGroups.includes(g))
    );
  }, [players, whoamiId]);
}

// Predicate for filtering completed-game sessions the same way: a session
// is visible if ANY of its players — checked against their CURRENT groupIds
// on the live players collection, not the session's own frozen snapshot,
// same reasoning as the live customGames lookup in data/stats.js — share a
// group with you (or is you). No whoami set, or you're not in any group
// yet: everything stays visible, same "no filter applies" fallback as
// useVisiblePlayers above.
export function useSessionGroupFilter(players) {
  const whoamiId = useWhoamiId();
  return useMemo(() => {
    const me = players.find((p) => p.id === whoamiId);
    const myGroups = me?.groupIds || [];
    if (!me || myGroups.length === 0) {
      return () => true;
    }
    const playersById = new Map(players.map((p) => [p.id, p]));
    return (session) => {
      const sessionPlayers = session.players || [];
      return sessionPlayers.some((sp) => {
        if (sp.id === me.id) return true;
        const current = playersById.get(sp.id);
        return current && (current.groupIds || []).some((g) => myGroups.includes(g));
      });
    };
  }, [players, whoamiId]);
}

// Non-hook version for places that already have the current whoami id in
// hand (e.g. computed once alongside other filtering) and don't want a
// second subscription.
export function visiblePlayers(players, whoamiId) {
  const active = players.filter((p) => p.active);
  const me = players.find((p) => p.id === whoamiId);
  const myGroups = me?.groupIds || [];
  if (!me || myGroups.length === 0) return active;
  return active.filter(
    (p) => p.id === me.id || (p.groupIds || []).some((g) => myGroups.includes(g))
  );
}
