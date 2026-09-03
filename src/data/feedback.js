// Bug reports / ideas typed into the box at the bottom of Home. No email,
// no backend function — this is just another shared Firestore collection
// (same pattern as players/customGames), read back on an unlinked "/feedback"
// page nobody stumbles onto by accident. Auto-generated ids (addDoc) since,
// unlike a player or custom game, there's nothing natural to slugify and no
// reason two entries would ever need to collide/merge.
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db, authReady } from "../firebase";

const feedbackCol = collection(db, "feedback");

export async function submitFeedback(text) {
  await authReady;
  const trimmed = (text || "").trim();
  if (!trimmed) throw new Error("Type something first.");
  await addDoc(feedbackCol, {
    text: trimmed,
    // Which page they were on when they hit send — small bit of context
    // for a bug report ("scores wouldn't save") without asking them to
    // explain where they were.
    path: typeof window !== "undefined" ? window.location.pathname : null,
    createdAt: serverTimestamp(),
  });
}

export async function deleteFeedback(id) {
  await authReady;
  await deleteDoc(doc(feedbackCol, id));
}

export function subscribeToFeedback(callback) {
  const q = query(feedbackCol, orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => {
      console.error("subscribeToFeedback failed:", err);
      callback([]);
    }
  );
}
