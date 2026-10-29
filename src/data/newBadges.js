// Which achievements did THIS finished game unlock? Badges themselves are
// never stored — they're derived from game history (see BADGE_DEFS in
// stats.js) — so "new" just means: earned with this game counted, not
// earned without it. That keeps the answer correct after undos, edits and
// backfills, and can't fire twice for the same unlock.
//
// Returns null while the completed-games feed hasn't caught up with the
// session yet (callers wait), otherwise an array — possibly empty — of
// { player, badge } in lineup order.
import { computeAchievements } from "./stats";

export function computeNewBadges(session, players, completedSessions) {
  if (!session || !(completedSessions || []).some((s) => s.id === session.id)) return null;
  const before = completedSessions.filter((s) => s.id !== session.id);
  const out = [];
  for (const sp of session.players || []) {
    const had = new Set(
      computeAchievements(sp.id, players, before)
        .filter((b) => b.earned)
        .map((b) => b.id)
    );
    const player = (players || []).find((p) => p.id === sp.id) || sp;
    for (const b of computeAchievements(sp.id, players, completedSessions)) {
      if (b.earned && !had.has(b.id)) {
        out.push({ player, badge: { id: b.id, emoji: b.emoji, label: b.label, description: b.description } });
      }
    }
  }
  return out;
}

// [{ player, badges: [...] }] — one entry per player, for display.
export function groupBadgesByPlayer(items) {
  const map = new Map();
  for (const { player, badge } of items || []) {
    if (!map.has(player.id)) map.set(player.id, { player, badges: [] });
    map.get(player.id).badges.push(badge);
  }
  return [...map.values()];
}
