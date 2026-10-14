// Checklist of "who this player usually plays with". Used on Me (your own
// favorites) and on the Players admin page (to preset someone else's, e.g.
// for family members who'd rather not fiddle with it). Empty = they see
// everyone — see data/favoriteVisibility.js.
import { useState } from "react";
import { setPlayerFavorites } from "../data/players";
import PlayerDot from "./PlayerDot";
import { shortName } from "../data/playerNames";

export default function FavoritesPicker({ player, players }) {
  const [busy, setBusy] = useState(false);
  const others = players.filter((p) => p.active && p.id !== player.id);
  const activeIds = new Set(others.map((p) => p.id));
  // Only count favorites that are still active players; stale ids are inert.
  const current = (player.favoriteIds || []).filter((id) => activeIds.has(id));

  async function save(next) {
    setBusy(true);
    try {
      await setPlayerFavorites(player.id, next);
    } finally {
      setBusy(false);
    }
  }

  function toggle(id) {
    save(current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  }

  if (others.length === 0) {
    return <p style={{ fontSize: 13, color: "var(--muted)" }}>No other players yet.</p>;
  }
  return (
    <div>
      <div className="chip-row">
        {others.map((p) => (
          <span
            key={p.id}
            role="button"
            aria-pressed={current.includes(p.id)}
            className={`player-chip ${current.includes(p.id) ? "selected" : ""}`}
            onClick={() => !busy && toggle(p.id)}
          >
            <PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />
            {shortName(p)}
          </span>
        ))}
      </div>
      <div className="btn-row" style={{ marginTop: 10, alignItems: "center" }}>
        <button type="button" className="btn ghost small" disabled={busy} onClick={() => save(others.map((p) => p.id))}>
          Select all
        </button>
        <button type="button" className="btn ghost small" disabled={busy || current.length === 0} onClick={() => save([])}>
          Clear
        </button>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>
          {current.length === 0 ? "None picked — shows everyone." : `${current.length} picked.`}
        </span>
      </div>
    </div>
  );
}
