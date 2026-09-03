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

// Named "scorecard_notes", not "feedback" — the Firestore collection name
// becomes part of the literal request URL
// (firestore.googleapis.com/.../documents/feedback), and "feedback" is a
// common word on ad-blocker/privacy-extension filter lists (uBlock Origin,
// Brave Shields, etc. — same family of rules that blocks "survey" or
// "tracking" URLs). That would explain everything else in the app working
// fine while writes to a collection literally named "feedback" silently
// stall or fail for some visitors. A bland, app-specific name sidesteps
// the whole class of bug.
const feedbackCol = collection(db, "scorecard_notes");

// Bounds how long we'll wait on a promise that could otherwise hang
// forever with no feedback to the person staring at a "Sending…" button —
// e.g. if anonymous sign-in (authReady) never resolves because it silently
// failed, or the write can't reach Firestore. Converts an indefinite hang
// into an actual error the UI can show and recover from.
function withTimeout(promise, ms, message) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export async function submitFeedback(text) {
  const trimmed = (text || "").trim();
  if (!trimmed) throw new Error("Type something first.");
  await withTimeout(authReady, 10000, "Still trying to connect — check your internet connection and try again.");
  await withTimeout(
    addDoc(feedbackCol, {
      text: trimmed,
      // Which page they were on when they hit send — small bit of context
      // for a bug report ("scores wouldn't save") without asking them to
      // explain where they were.
      path: typeof window !== "undefined" ? window.location.pathname : null,
      createdAt: serverTimestamp(),
    }),
    10000,
    "That's taking too long to send — check your connection and try again."
  );
}

export async function deleteFeedback(id) {
  await withTimeout(authReady, 10000, "Still trying to connect — check your internet connection and try again.");
  await withTimeout(deleteDoc(doc(feedbackCol, id)), 10000, "That's taking too long — check your connection and try again.");
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
