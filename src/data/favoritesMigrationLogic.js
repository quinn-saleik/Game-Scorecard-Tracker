// Pure part of the groups -> favorites migration (kept apart from the
// Firestore code so it can be unit-tested). See favoritesMigration.js.
export function computeFavoriteMigration(players) {
  const updates = {};
  for (const p of players) {
    if (Array.isArray(p.favoriteIds)) continue;
    const mine = Array.isArray(p.groupIds) ? p.groupIds : [];
    if (mine.length === 0) continue;
    updates[p.id] = players
      .filter((o) => o.id !== p.id && (o.groupIds || []).some((g) => mine.includes(g)))
      .map((o) => o.id);
  }
  return updates;
}
