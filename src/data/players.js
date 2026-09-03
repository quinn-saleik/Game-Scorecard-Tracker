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

// How long a removed player lingers in the "Removed players" list before
// they're gone for good. Nothing in this app runs on a server schedule (no
// backend functions), so this is only ever enforced opportunistically —
// whenever someone happens to have the Players page open, see
// purgeStaleRemovedPlayers below.
export const REMOVED_PLAYER_GRACE_MS = 4 * 60 * 60 * 1000; // 4 hours

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
// deactivatedAt starts the removal grace period (cleared on restore) — see
// REMOVED_PLAYER_GRACE_MS / purgeStaleRemovedPlayers.
export async function setPlayerActive(playerId, active) {
  await authReady;
  await updateDoc(doc(playersCol, playerId), {
    active,
    deactivatedAt: active ? null : serverTimestamp(),
  });
}

// Milliseconds left before a removed player disappears for good, for the UI
// hint ("removes in ~3h"). A player just removed this session may not have
// their serverTimestamp() synced back yet — treat that as "the full grace
// period remains" rather than "expired".
export function removedPlayerTimeLeftMs(player) {
  const deactivatedAt = player.deactivatedAt?.toDate?.();
  if (!deactivatedAt) return REMOVED_PLAYER_GRACE_MS;
  return Math.max(0, REMOVED_PLAYER_GRACE_MS - (Date.now() - deactivatedAt.getTime()));
}

// Opportunistic cleanup, called whenever the Players page loads a fresh
// player list. Hard-deletes anyone who's been inactive longer than the
// grace period. Players removed before this feature existed have no
// deactivatedAt yet — back-fill one instead of deleting them outright, so
// they get the same few-hour grace window instead of vanishing the moment
// this code first runs for them.
export async function purgeStaleRemovedPlayers(players) {
  await authReady;
  const writes = [];
  for (const p of players) {
    if (p.active) continue;
    if (!p.deactivatedAt) {
      writes.push(updateDoc(doc(playersCol, p.id), { deactivatedAt: serverTimestamp() }));
    } else if (removedPlayerTimeLeftMs(p) <= 0) {
      writes.push(deleteDoc(doc(playersCol, p.id)));
    }
  }
  await Promise.all(writes);
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
