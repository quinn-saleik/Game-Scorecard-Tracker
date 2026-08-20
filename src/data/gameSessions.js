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

// Hard delete — used by the "quit game" option on an in-progress session.
// Completed games are never deleted this way (there's no UI path to it).
export async function deleteSession(sessionId) {
  await authReady;
  await deleteDoc(doc(sessionsCol, sessionId));
}

export function subscribeToSession(sessionId, callback) {
  return onSnapshot(doc(sessionsCol, sessionId), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

// Live feed of every completed game, newest first — used by the stats page.
export function subscribeToCompletedSessions(callback) {
  const q = query(
    sessionsCol,
    where("status", "==", "completed"),
    orderBy("completedAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export function subscribeToInProgressSessions(callback) {
  const q = query(sessionsCol, where("status", "==", "in_progress"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}
