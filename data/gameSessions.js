// Generic game session store, shared by every game type (Flip7, Oh Heck!,
// Euchre variants, Other). Each game's UI decides what goes in `config` and
// `rounds`; this module just persists/reads/subscribes.
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db, authReady } from "../firebase";
import { getInitialTotals } from "./rounds";

const sessionsCol = collection(db, "gameSessions");

// players: [{id, name}]
// gameType: 'flip7' | 'oh-heck' | 'euchre-2p' | 'euchre-3p' | 'euchre-traditional'
//         | 'euchre-15card' | 'euchre-partner' | 'catchphrase' | 'thirty-one'
//         | 'royal-rum' | 'other'
// initialTotals: optional override for the starting totals map (e.g. Euchre
// 3-player starts everyone at 15 and counts down instead of up from 0).
export async function createSession({ gameType, gameLabel, players, config, initialTotals }) {
  await authReady;
  const ref = await addDoc(sessionsCol, {
    gameType,
    gameLabel: gameLabel || gameType,
    players,
    config: config || {},
    rounds: [],
    totals: initialTotals || Object.fromEntries(players.map((p) => [p.id, 0])),
    status: "in_progress",
    winnerIds: [],
    startedAt: serverTimestamp(),
    completedAt: null,
  });
  return ref.id;
}

export async function updateSession(sessionId, partial) {
  await authReady;
  await updateDoc(doc(sessionsCol, sessionId), partial);
}

export async function completeSession(sessionId, { winnerIds, totals }) {
  await authReady;
  await updateDoc(doc(sessionsCol, sessionId), {
    status: "completed",
    winnerIds,
    totals,
    completedAt: serverTimestamp(),
  });
}

// "Play again" from a finished game's Recap screen: same game type, same
// lineup (frozen as of that game, same as the finished session's own
// scoreboard), same config (teams/threshold/lives/etc.) — reuses
// getInitialTotals so each game type's starting totals rule (e.g. "31"
// starts at its configured lives, Euchre 3-player at its starting score)
// only has to live in one place. Skips Setup entirely.
export async function rematchSession(session) {
  await authReady;
  const ref = await addDoc(sessionsCol, {
    gameType: session.gameType,
    gameLabel: session.gameLabel || session.gameType,
    players: session.players,
    config: session.config || {},
    rounds: [],
    totals: getInitialTotals(session.gameType, session),
    status: "in_progress",
    winnerIds: [],
    startedAt: serverTimestamp(),
    completedAt: null,
  });
  return ref.id;
}

// Hard delete — permanent, no undo. Used for the "quit game" option on an
// in-progress session, and for permanently emptying a completed game out
// of the trash (see softDeleteSession below).
export async function deleteSession(sessionId) {
  await authReady;
  await deleteDoc(doc(sessionsCol, sessionId));
}

// Soft delete for a *completed* game: marks it trashed instead of removing
// it, so a slip of the "Delete" button on the Stats page doesn't erase
// real family history. Trashed games drop out of subscribeToCompletedSessions
// (and therefore out of every stat, Hall of Fame record, etc.) but stay
// recoverable until someone empties the trash (deleteSession).
export async function softDeleteSession(sessionId) {
  await authReady;
  await updateDoc(doc(sessionsCol, sessionId), { deletedAt: serverTimestamp() });
}

export async function restoreSession(sessionId) {
  await authReady;
  await updateDoc(doc(sessionsCol, sessionId), { deletedAt: null });
}

export function subscribeToSession(sessionId, callback) {
  return onSnapshot(
    doc(sessionsCol, sessionId),
    (snap) => {
      callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    },
    (err) => {
      console.error("subscribeToSession failed:", err);
      callback(null);
    }
  );
}

// Live feed of every completed, non-trashed game, newest first — used
// everywhere stats/records are computed. Filtered for `deletedAt` client
// side (rather than in the query) since Firestore's `== null` doesn't
// match documents that never had the field set at all, which is every
// game completed before the trash feature existed.
export function subscribeToCompletedSessions(callback) {
  const q = query(
    sessionsCol,
    where("status", "==", "completed"),
    orderBy("completedAt", "desc")
  );
  return onSnapshot(
    q,
    (snap) => {
      callback(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((s) => !s.deletedAt)
      );
    },
    (err) => {
      // Same reasoning as subscribeToPlayers: without an error handler, a
      // failed listener never calls back at all, and any page gating its
      // "Loading…" state on this subscription hangs on that message
      // forever instead of settling into its actual empty state.
      console.error("subscribeToCompletedSessions failed:", err);
      callback([]);
    }
  );
}

// The trash: completed games that were soft-deleted, newest-trashed first.
// Powers the "Restore" list on the Stats page.
export function subscribeToTrashedSessions(callback) {
  const q = query(
    sessionsCol,
    where("status", "==", "completed"),
    orderBy("completedAt", "desc")
  );
  return onSnapshot(
    q,
    (snap) => {
      const trashed = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((s) => !!s.deletedAt);
      trashed.sort((a, b) => (b.deletedAt?.toMillis?.() || 0) - (a.deletedAt?.toMillis?.() || 0));
      callback(trashed);
    },
    (err) => {
      console.error("subscribeToTrashedSessions failed:", err);
      callback([]);
    }
  );
}

export function subscribeToInProgressSessions(callback) {
  const q = query(sessionsCol, where("status", "==", "in_progress"));
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    },
    (err) => {
      console.error("subscribeToInProgressSessions failed:", err);
      callback([]);
    }
  );
}
