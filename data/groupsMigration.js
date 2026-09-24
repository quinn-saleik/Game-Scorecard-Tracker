// One-time migration: introduce groups without breaking anyone's existing
// roster. Guarded purely by "does a `groups` doc already exist" — no
// separate migrated-flag doc to go stale — so it's naturally a no-op on
// every load after the first. Every active player at the time this first
// runs lands in "Worthington Family" (the original, pre-groups roster);
// "Nashville Friends" is created empty for Quinn (or anyone) to add people
// to from the Me page. Anyone who signs on later just joins whichever
// group(s) fit them — this migration only ever runs once, for the roster
// that predates groups entirely.
import { writeBatch, doc, getDocs, collection } from "firebase/firestore";
import { db, authReady } from "../firebase";
import { getGroupsOnce, addGroup } from "./groups";

const playersCol = collection(db, "players");

let ran = false;

export async function migrateToGroupsIfNeeded() {
  if (ran) return;
  ran = true;
  try {
    await authReady;
    const existingGroups = await getGroupsOnce();
    if (existingGroups.length > 0) return; // already migrated (or set up fresh)

    const familyId = await addGroup("Worthington Family");
    await addGroup("Nashville Friends");

    const playersSnap = await getDocs(playersCol);
    const batch = writeBatch(db);
    playersSnap.docs.forEach((d) => {
      const current = d.data().groupIds;
      if (!Array.isArray(current) || current.length === 0) {
        batch.update(doc(playersCol, d.id), { groupIds: [familyId] });
      }
    });
    await batch.commit();
  } catch (err) {
    // Non-fatal: worst case, groups stay empty and every screen's
    // "unfiltered when no groups apply" fallback keeps the app usable.
    console.error("Groups migration failed:", err);
    ran = false; // let it retry on the next load
  }
}
