// Top-bar "who am I" picker — lets whoever's holding the phone say which
// player they are. Purely a personalization convenience (see data/whoami.js):
// picking yourself here just sets a localStorage default, it never gates
// anything. Every screen must render fine with no selection at all.
import { useState, useEffect } from "react";
import { subscribeToPlayers } from "../data/players";
import { useWhoamiId, setWhoamiId } from "../data/whoami";
import { shortName } from "../data/playerNames";
import PlayerDot from "./PlayerDot";

// Round face for the top-bar button: photo if there is one, else the emoji
// avatar, else the first initial — always on the player's color.
function AvatarFace({ me }) {
  if (me.photo) {
    return <img src={me.photo} alt="" aria-hidden="true" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%", display: "block" }} />;
  }
  return (
    <span aria-hidden="true" style={{ fontSize: me.avatar ? 19 : 16, fontWeight: 800, color: "#fff", lineHeight: 1 }}>
      {me.avatar || (me.name || "?").trim().charAt(0).toUpperCase()}
    </span>
  );
}

export default function WhoAmI() {
  const [players, setPlayers] = useState([]);
  const [open, setOpen] = useState(false);
  const whoamiId = useWhoamiId();

  useEffect(() => subscribeToPlayers(setPlayers), []);

  const active = players.filter((p) => p.active !== false);
  const me = players.find((p) => p.id === whoamiId) || null;

  function pick(playerId) {
    setWhoamiId(playerId === whoamiId ? null : playerId);
    setOpen(false);
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        className={me ? "avatar-btn" : "icon-btn invite"}
        style={me ? { background: me.photo ? "var(--wood)" : me.color || "#c0392b" } : undefined}
        onClick={() => setOpen((o) => !o)}
        aria-label={me ? `You're playing as ${me.name}. Change?` : "Who are you?"}
        title={me ? `You're playing as ${me.name}` : "Who are you?"}
      >
        {me ? <AvatarFace me={me} /> : "👤"}
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 20 }} />
          <div
            className="card-surface"
            style={{
              position: "absolute",
              right: 0,
              top: "calc(100% + 8px)",
              width: 240,
              zIndex: 21,
              margin: 0,
            }}
          >
            <h2 style={{ fontSize: 15 }}>Who are you?</h2>
            {active.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--muted)" }}>No players yet.</p>
            ) : (
              <div className="chip-row">
                {active.map((p) => (
                  <span
                    key={p.id}
                    className={`player-chip ${p.id === whoamiId ? "selected" : ""}`}
                    onClick={() => pick(p.id)}
                  >
                    <PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />
                    {shortName(p)}
                  </span>
                ))}
              </div>
            )}
            {me && (
              <p
                style={{ fontSize: 12, color: "var(--muted)", marginTop: 10, marginBottom: 0, cursor: "pointer" }}
                onClick={() => pick(me.id)}
              >
                Not {shortName(me)}? Tap to clear.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
