// "Favorites" vs "Show everyone" — a per-device view switch, shared by every
// screen that filters people (game setup pickers, Stats, Hall of Fame). It's
// deliberately NOT stored on the player doc: it's the quick escape hatch
// ("show me everybody for a minute"), so it has to work even if a player's
// favorites are missing or wrong, and flipping it on one phone shouldn't
// change anyone else's.
import { useState, useEffect } from "react";

const KEY = "scorecard:show-everyone";
const CHANGE_EVENT = "scorecard:show-everyone-changed";

export function getShowEveryone() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setShowEveryone(on) {
  try {
    if (on) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {
    // Storage blocked — still applies for this page load via the event.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

// React hook: [showEveryone, setShowEveryone], live across components/tabs.
export function useShowEveryone() {
  const [on, setOn] = useState(getShowEveryone);
  useEffect(() => {
    const sync = () => setOn(getShowEveryone());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return [on, setShowEveryone];
}
