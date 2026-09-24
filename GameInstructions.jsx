import { useState } from "react";

// Collapsed-by-default "How to play" panel for a game's Setup screen.
// Renders as a small (i) toggle so it doesn't compete with the player
// picker for space; tapping it again (or the "Hide instructions" label)
// closes it. `players` is a short string like "3–6 players" and always
// shows first when the panel is open.
export default function GameInstructions({ players, children }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="card-surface" style={{ paddingTop: 14, paddingBottom: open ? 20 : 14 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          fontSize: 15,
          fontWeight: 700,
          color: "var(--heading-on-surface)",
        }}
      >
        <span style={{ fontSize: 18, lineHeight: 1 }}>ⓘ</span>
        {open ? "Hide instructions" : "How to play"}
      </button>
      {open && (
        <div style={{ marginTop: 12 }}>
          {players && (
            <p style={{ margin: "0 0 8px", fontWeight: 700, color: "var(--text-on-surface)" }}>
              Players: {players}
            </p>
          )}
          <div style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.5 }}>{children}</div>
        </div>
      )}
    </div>
  );
}
