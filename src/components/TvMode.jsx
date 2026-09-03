import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import PlayerDot from "./PlayerDot";

// A fullscreen, always-dark, oversized scoreboard meant to be read from
// across a room — the idea being one phone stays in someone's hands doing
// the actual scoring while a second phone (or a tablet propped up nearby)
// sits in TV mode showing the live standings. Both phones are just
// independent viewers of the same shared Firestore session, so this needs
// no casting/pairing of its own: whoever opens TV mode for a given game
// sees it update the moment the scorekeeper saves a round, the same as any
// other screen subscribed to that session.
//
// Deliberately ignores the light/dark preference toggle — this is meant to
// be readable from across a room regardless of what the scorekeeper's
// phone is set to, so colors are hardcoded to the app's "cover" palette
// rather than pulled from the (possibly-flipped) CSS custom properties.
//
// rows: pre-sorted best-to-worst by the caller (every game's "who's
// winning" rule is different — lowest wins in Hearts, a team total in
// Spades, lives left in 31 — so TvMode just renders whatever order it's
// given rather than re-deriving it). Each row: { key, label, score,
// isLeader, color?, avatar?, photo? }. Omit color/avatar/photo for
// team rows (Catchphrase, Spades, Euchre team variants) — the row still
// renders fine without a dot.
export default function TvMode({ gameName, icon, statusLine, rows, unitLabel }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="btn ghost small"
        style={{ color: "var(--cream)" }}
        onClick={() => setOpen(true)}
        title="Show a big live scoreboard — hand a second phone or tablet to the table"
      >
        📺 TV mode
      </button>
      {open &&
        createPortal(
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "radial-gradient(ellipse at top, #223247 0%, #10161f 70%)",
              color: "#eef1f6",
              display: "flex",
              flexDirection: "column",
              padding: "max(24px, env(safe-area-inset-top)) 24px max(24px, env(safe-area-inset-bottom))",
              fontFamily: '"Bitter", Georgia, "Iowan Old Style", serif',
            }}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Exit TV mode"
              style={{
                position: "absolute",
                top: "max(16px, env(safe-area-inset-top))",
                right: 20,
                background: "rgba(238,241,246,0.1)",
                border: "2px solid rgba(238,241,246,0.35)",
                color: "#eef1f6",
                borderRadius: 12,
                width: 48,
                height: 48,
                fontSize: 20,
                cursor: "pointer",
              }}
            >
              ✕
            </button>

            <div style={{ textAlign: "center", marginTop: 8, marginBottom: "3vh" }}>
              <div style={{ fontSize: "clamp(32px, 6vw, 56px)" }}>{icon}</div>
              <h1
                style={{
                  fontSize: "clamp(28px, 5vw, 48px)",
                  fontWeight: 800,
                  margin: "4px 0 0",
                  color: "#eef1f6",
                }}
              >
                {gameName}
              </h1>
              {statusLine && (
                <p style={{ fontSize: "clamp(14px, 2vw, 20px)", color: "#c9ab68", margin: "6px 0 0", letterSpacing: "0.03em" }}>
                  {statusLine}
                </p>
              )}
            </div>

            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: "1.4vh",
                justifyContent: "center",
                maxWidth: 900,
                width: "100%",
                margin: "0 auto",
                overflowY: "auto",
              }}
            >
              {rows.map((r, i) => (
                <div
                  key={r.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "3vw",
                    padding: "1.6vh 3vw",
                    borderRadius: 16,
                    background: r.isLeader ? "rgba(171,138,63,0.22)" : "rgba(238,241,246,0.05)",
                    border: r.isLeader ? "2px solid #ab8a3f" : "2px solid transparent",
                  }}
                >
                  <span style={{ fontSize: "clamp(20px, 3vw, 32px)", color: "#90a0b2", width: "2ch", flexShrink: 0 }}>
                    {r.isLeader ? "👑" : `${i + 1}`}
                  </span>
                  {(r.color || r.avatar || r.photo) && (
                    <PlayerDot color={r.color} avatar={r.avatar} photo={r.photo} />
                  )}
                  <span
                    style={{
                      flex: 1,
                      fontSize: "clamp(20px, 3.4vw, 36px)",
                      fontWeight: 700,
                      color: "#eef1f6",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {r.label}
                  </span>
                  <span
                    style={{
                      fontFamily: '"Courier Prime", "Courier New", monospace',
                      fontVariantNumeric: "tabular-nums",
                      fontSize: "clamp(24px, 4.2vw, 44px)",
                      fontWeight: 700,
                      color: r.isLeader ? "#d9c17f" : "#eef1f6",
                    }}
                  >
                    {r.score}
                    {unitLabel && <span style={{ fontSize: "0.4em", marginLeft: 6, color: "#90a0b2" }}>{unitLabel}</span>}
                  </span>
                </div>
              ))}
            </div>

            <p style={{ textAlign: "center", color: "#626e7d", fontSize: 13, margin: "3vh 0 0" }}>
              Updates live as scores are entered — tap ✕ or press Esc to exit
            </p>
          </div>,
          document.body
        )}
    </>
  );
}
