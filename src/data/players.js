// Player management: add/remove, live subscription. Every player is
// created with a first + last name (family has enough overlap in first
// names alone that "who's Riley?" comes up); the full name stays on the
// doc as `name` so every other part of the app that just reads `p.name`
// keeps working unchanged, while `firstName`/`lastName` power the
// "First L." short form shown on scorecards during gameplay (see
// data/playerNames.js).
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db, authReady } from "../firebase";

const playersCol = collection(db, "players");

function slugify(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export async function addPlayer(firstName, lastName) {
  await authReady;
  const first = (firstName || "").trim();
  const last = (lastName || "").trim();
  if (!first || !last) throw new Error("Enter both a first and last name.");
  const fullName = `${first} ${last}`;
  let id = slugify(fullName);

  // Guard against two different players landing on the same doc id (e.g.
  // two "Riley Smith"s) — the old single-name version of this function
  // would have silently merged them into one doc.
  const existing = await getDocs(playersCol);
  const takenIds = new Set(existing.docs.map((d) => d.id));
  if (takenIds.has(id)) {
    let n = 2;
    while (takenIds.has(`${id}-${n}`)) n += 1;
    id = `${id}-${n}`;
  }

  await setDoc(doc(playersCol, id), {
    firstName: first,
    lastName: last,
    name: fullName,
    active: true,
    isDefault: false,
    createdAt: serverTimestamp(),
  });
  return id;
}

// Soft delete: keep the player doc (so past game stats still resolve their
// name) but mark them inactive so they drop out of "who's playing" pickers.
// Removed players stick around indefinitely (no auto-expiry) — deactivatedAt
// is kept purely as a "removed X ago" hint on the Players page, so cleaning
// up is a manual, whenever-you-feel-like-it thing (the 🗑 button), not
// something the app does to your roster on its own. A player removed before
// this field existed just won't show a time — nothing backfills it.
export async function setPlayerActive(playerId, active) {
  await authReady;
  await updateDoc(doc(playersCol, playerId), {
    active,
    deactivatedAt: active ? null : serverTimestamp(),
  });
}

// Fix a typo'd name after the fact. Doesn't touch the doc id (generated
// once at creation from the original name) or any past game snapshot —
// those keep the name as it was played under, same as color/avatar
// changes not being retroactive.
export async function updatePlayerName(playerId, firstName, lastName) {
  await authReady;
  const first = (firstName || "").trim();
  const last = (lastName || "").trim();
  if (!first || !last) throw new Error("Enter both a first and last name.");
  await updateDoc(doc(playersCol, playerId), {
    firstName: first,
    lastName: last,
    name: `${first} ${last}`,
  });
}

// Hard delete — removes the player doc entirely. Past game sessions keep
// their own snapshot of the player (name/color/avatar/photo at the time),
// so old scorecards still display correctly; only this player's own
// roster entry and aggregate stats go away.
export async function deletePlayer(playerId) {
  await authReady;
  await deleteDoc(doc(playersCol, playerId));
}

// One-click cleanup for the sample roster this app used to seed by
// default (Marsha, Doug, Riley, ...). Safe no-op once they're gone.
export async function deleteDefaultPlayers() {
  await authReady;
  const snap = await getDocs(query(playersCol, where("isDefault", "==", true)));
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  return snap.docs.length;
}

export async function setPlayerColor(playerId, color) {
  await authReady;
  await updateDoc(doc(playersCol, playerId), { color });
}

export async function setPlayerAvatar(playerId, avatar) {
  await authReady;
  await updateDoc(doc(playersCol, playerId), { avatar });
}

// photo: a small data: URI (already resized/cropped client-side — see
// src/data/photo.js) or null to remove it and fall back to color/avatar.
export async function setPlayerPhoto(playerId, photo) {
  await authReady;
  await updateDoc(doc(playersCol, playerId), { photo });
}

export function subscribeToPlayers(callback) {
  const q = query(playersCol, orderBy("name"));
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    },
    (err) => {
      // Without this, a permission hiccup (e.g. the anonymous sign-in not
      // having landed yet) would leave onSnapshot's success callback never
      // firing at all — which is exactly what makes a page's "Loading…"
      // gate get stuck forever instead of settling on an empty state.
      console.error("subscribeToPlayers failed:", err);
      callback([]);
    }
  );
}
