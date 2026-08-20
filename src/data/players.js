// Player management: default roster, add/remove, live subscription.
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db, authReady } from "../firebase";

export const DEFAULT_PLAYERS = [
  "Marsha",
  "Doug",
  "Riley",
  "Owen",
  "Quinn",
  "Amy",
  "Brad",
  "Jonah",
  "Reese",
  "Ryan",
  "Reid",
  "Kristy",
  "Joel",
];

const playersCol = collection(db, "players");

function slugify(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

// One-time seed of the default roster. Safe to call repeatedly: uses the
// player's slug as the doc id, so it never creates duplicates.
export async function seedDefaultPlayers() {
  await authReady;
  await Promise.all(
    DEFAULT_PLAYERS.map((name) =>
      setDoc(
        doc(playersCol, slugify(name)),
        {
          name,
          active: true,
          isDefault: true,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      )
    )
  );
}

export async function addPlayer(name) {
  await authReady;
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Player name can't be empty.");
  const id = slugify(trimmed);
  await setDoc(
    doc(playersCol, id),
    {
      name: trimmed,
      active: true,
      isDefault: false,
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
  return id;
}

// Soft delete: keep the player doc (so past game stats still resolve their
// name) but mark them inactive so they drop out of "who's playing" pickers.
export async function setPlayerActive(playerId, active) {
  await authReady;
  await updateDoc(doc(playersCol, playerId), { active });
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
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}
