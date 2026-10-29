// Games someone makes up through "Other" — a name plus a small set of
// reusable rules (which way scores count, an optional target, whether to
// track bids). Saving one gives it its own tile on the Home screen for
// everyone using this app, the same as a built-in game, so the next person
// to play "Poker" or "Yahtzee" doesn't have to redescribe it from scratch.
//
// Every custom game still plays through the generic "other" gameType /
// OtherPlay screen — this collection only stores what Setup should
// pre-fill. A session bakes the config in at creation time (same as every
// other game), so editing a custom game's rules later never changes a
// game already in progress or in the history books.
import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db, authReady } from "../firebase";

const customGamesCol = collection(db, "customGames");

export function slugifyGameName(name) {
  return (name || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export const DEFAULT_GAME_CONFIG = {
  scoreDirection: "up", // "up" = highest total wins, "down" = lowest total wins
  startingScore: 0,
  targetScore: null, // null = no threshold — finish manually whenever
  bidding: false, // track an optional per-round bid alongside the score
  winnerOnly: false, // true = no scoring at all: just who played and who won
  houseRules: "", // free-text notes for anything the structured options don't cover
};

// Create a brand-new custom game or update an existing one in place — the
// doc id is derived from the name, so saving under a name that already
// exists (any capitalization/spacing) updates that same tile instead of
// forking a second one, matching how Stats already groups "Other" games
// by name.
export async function saveCustomGame(name, config, icon) {
  await authReady;
  const trimmed = (name || "").trim();
  if (!trimmed) throw new Error("Name the game first.");
  const id = slugifyGameName(trimmed);
  await setDoc(
    doc(customGamesCol, id),
    {
      name: trimmed,
      icon: icon || "🃏",
      config: { ...DEFAULT_GAME_CONFIG, ...config },
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  return id;
}

export async function getCustomGame(id) {
  await authReady;
  const snap = await getDoc(doc(customGamesCol, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// Removes the Home-screen tile and its saved rules. Games already played
// under this name keep their history in Stats — only the reusable tile
// goes away, and it can always be recreated with the same name later.
export async function deleteCustomGame(id) {
  await authReady;
  await deleteDoc(doc(customGamesCol, id));
}

// Games that ship with the app: always on the Home screen for everyone, no
// matter what's in Firestore, and can't be removed. Sequence is just-who-won
// (no scoring). If someone already saved a "Sequence" tile of their own, its
// icon and house rules are kept, but it's always a just-who-won game.
export const BUILTIN_CUSTOM_GAMES = [
  {
    id: "sequence",
    name: "Sequence",
    icon: "🔗",
    builtin: true,
    config: { ...DEFAULT_GAME_CONFIG, winnerOnly: true },
  },
];

export function withBuiltinGames(saved) {
  const byId = new Map((saved || []).map((g) => [g.id, g]));
  const merged = BUILTIN_CUSTOM_GAMES.map((b) => {
    const mine = byId.get(b.id);
    return mine
      ? { ...b, ...mine, builtin: true, config: { ...DEFAULT_GAME_CONFIG, ...mine.config, winnerOnly: true } }
      : b;
  });
  const builtinIds = new Set(BUILTIN_CUSTOM_GAMES.map((b) => b.id));
  return [...merged, ...(saved || []).filter((g) => !builtinIds.has(g.id))].sort((a, b) => a.name.localeCompare(b.name));
}

export function subscribeToCustomGames(callback) {
  const q = query(customGamesCol, orderBy("name"));
  return onSnapshot(
    q,
    (snap) => callback(withBuiltinGames(snap.docs.map((d) => ({ id: d.id, ...d.data() })))),
    (err) => {
      console.error("subscribeToCustomGames failed:", err);
      callback(withBuiltinGames([]));
    }
  );
}
