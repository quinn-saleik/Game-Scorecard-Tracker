// Groups: a lightweight, UI-only way to keep a big shared roster from
// showing everyone to everyone. There is still no login/auth in this app —
// group membership lives on each player doc (`groupIds: string[]`) and is
// used purely to filter which players a screen offers by default. Nothing
// here is a security boundary; it's "cleaner UI for limited player
// options," per how this was scoped.
import {
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db, authReady } from "../firebase";

const groupsCol = collection(db, "groups");

function slugify(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

// Creates the group if it doesn't already exist (by slug); returns its id
// either way, so "create or reuse" call sites don't need a separate check.
export async function addGroup(name) {
  await authReady;
  const trimmed = (name || "").trim();
  if (!trimmed) throw new Error("Enter a group name.");
  const id = slugify(trimmed);
  const existing = await getDocs(groupsCol);
  const already = existing.docs.find((d) => d.id === id);
  if (already) return id;
  await setDoc(doc(groupsCol, id), { name: trimmed, createdAt: serverTimestamp() });
  return id;
}

export function subscribeToGroups(callback) {
  const q = query(groupsCol, orderBy("name"));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => {
      console.error("subscribeToGroups failed:", err);
      callback([]);
    }
  );
}

export async function getGroupsOnce() {
  await authReady;
  const snap = await getDocs(groupsCol);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
