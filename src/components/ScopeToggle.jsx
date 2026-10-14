// "★ Favorites | 👥 Everyone" switch for any list of people. Hidden when no
// filtering would apply anyway (no one signed in, or no favorites yet), so
// it only shows up when it actually changes something. The choice is
// per-device and shared by every screen (see data/viewScope.js) — it's the
// quick workaround if a list ever looks wrong.
import { useWhoamiId } from "../data/whoami";
import { useShowEveryone } from "../data/viewScope";
import { circleSize } from "../data/favoriteVisibility";

export default function ScopeToggle({ players }) {
  const whoamiId = useWhoamiId();
  const [showAll, setShowAll] = useShowEveryone();
  if (circleSize(players, whoamiId) === 0) return null;
  return (
    <div className="scope-toggle" role="group" aria-label="Which players to show">
      <button type="button" className={showAll ? "" : "on"} aria-pressed={!showAll} onClick={() => setShowAll(false)}>
        ★ Favorites
      </button>
      <button type="button" className={showAll ? "on" : ""} aria-pressed={showAll} onClick={() => setShowAll(true)}>
        👥 Everyone
      </button>
    </div>
  );
}
