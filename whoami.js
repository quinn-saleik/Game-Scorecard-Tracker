// "Who am I" — which player THIS DEVICE belongs to. A personalization
// convenience, not an account system: the app still has no login/auth,
// and this is stored only in localStorage, never synced to Firestore or
// enforced as a permission boundary. Every screen must work fine with no
// whoami set at all (a fresh device, a shared/passed-around phone, or
// someone who never bothers) — it's an opt-in default, never a gate.
import { useState, useEffect } from "react";

const KEY = "scorecard:whoami";
// A same-tab custom event, fired on every set. localStorage's own
// `storage` event only fires in OTHER tabs/windows, never the one that
// made the write — without this, a component that already rendered
// before you picked yourself would never find out.
const CHANGE_EVENT = "scorecard:whoami-changed";

export function getWhoamiId() {
  try {
    return localStorage.getItem(KEY) || null;
  } catch {
    // Private browsing / storage blocked — just means "unset for now."
    return null;
  }
}

export function setWhoamiId(playerId) {
  try {
    if (playerId) localStorage.setItem(KEY, playerId);
    else localStorage.removeItem(KEY);
  } catch {
    // Storage unavailable — the picker still works for the rest of this
    // page load via the change event below, it just won't remember
    // across a refresh.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export { CHANGE_EVENT as WHOAMI_CHANGE_EVENT };

// React hook: the current whoami id, live-updated. Binds to both the
// same-tab CHANGE_EVENT (fired by setWhoamiId above) and the native
// `storage` event (fired in OTHER tabs when they change it) so every
// component using this hook stays in sync regardless of where the change
// came from.
export function useWhoamiId() {
  const [id, setId] = useState(getWhoamiId);

  useEffect(() => {
    const sync = () => setId(getWhoamiId());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return id;
}
