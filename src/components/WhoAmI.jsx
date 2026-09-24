// Top-bar "who am I" picker — lets whoever's holding the phone say which
// player they are. Purely a personalization convenience (see data/whoami.js):
// picking yourself here just sets a localStorage default, it never gates
// anything. Every screen must render fine with no selection at all.
import { useState, useEffect } from "react";
import { subscribeToPlayers } from "../data/players";
import { useWhoamiId, setWhoamiId } from "../data/whoami";
import { shortName } from "../data/playerNames";
import PlayerDot from "./PlayerDot";

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
        className="btn ghost small"
        style={{
          padding: "6px 10px",
          minHeight: "auto",
          border: "1px solid rgba(238, 241, 246, 0.3)",
          borderRadius: 10,
          fontSize: 13,
          lineHeight: 1,
          display: "inline-flex",
          alignItems: "center",
          gap: me ? 0 : 4,
          maxWidth: 120,
        }}
        onClick={() => setOpen((o) => !o)}
        aria-label={me ? `You're playing as ${me.name}. Change?` : "Who are you?"}
        title={me ? `You're playing as ${me.name}` : "Who are you?"}
      >
        {me ? (
          <>
            <PlayerDot color={me.color} avatar={me.avatar} photo={me.photo} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {shortName(me)}
            </span>
          </>
        ) : (
          <>👤 Who are you?</>
        )}
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
