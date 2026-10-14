// One-time migration from Groups to Favorites. Preloads every player's
// favorites with everyone they shared a group with, so nobody's lists change
// on day one. Per-player and idempotent: only players that have group
// memberships but no `favoriteIds` field yet are touched, so it's a no-op on
// every later load, and a player whose favorites were deliberately emptied
// (an empty array still counts as "has the field") is never re-filled.
// The old `groupIds` are left in place, unread — a free rollback path.
import { writeBatch, doc, getDocs, collection } from "firebase/firestore";
import { db, authReady } from "../firebase";
import { computeFavoriteMigration } from "./favoritesMigrationLogic";

const playersCol = collection(db, "players");

let ran = false;

export async function migrateToFavoritesIfNeeded() {
  if (ran) return;
  ran = true;
  try {
    await authReady;
    const snap = await getDocs(playersCol);
    const players = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const updates = computeFavoriteMigration(players);
    const ids = Object.keys(updates);
    if (ids.length === 0) return;
    const batch = writeBatch(db);
    ids.forEach((id) => batch.update(doc(playersCol, id), { favoriteIds: updates[id] }));
    await batch.commit();
  } catch (err) {
    // Non-fatal: with no favorites on a player, every screen shows everyone.
    console.error("Favorites migration failed:", err);
    ran = false; // retry on the next load
  }
}
