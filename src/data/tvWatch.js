// Remembers which game this device's TV mode is showing, so that when the
// game finishes — which unmounts the play screen and TV mode with it —
// something at the app level (components/TvFinishWatcher.jsx) can still
// announce the winner and any new badges on the TV. sessionStorage, so it
// dies with the tab and never leaks to another visit.
const KEY = "scorecard:tv-watching";
export const TV_WATCH_EVENT = "scorecard:tv-watch-changed";

export function getTvWatch() {
  try {
    return sessionStorage.getItem(KEY) || null;
  } catch {
    return null;
  }
}

export function setTvWatch(sessionId) {
  try {
    if (sessionId) sessionStorage.setItem(KEY, sessionId);
    else sessionStorage.removeItem(KEY);
  } catch {
    // storage blocked — TV mode still works, it just won't announce the finish
  }
  window.dispatchEvent(new Event(TV_WATCH_EVENT));
}
