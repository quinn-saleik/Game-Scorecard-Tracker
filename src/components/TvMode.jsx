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
// winning" rule is different — lowest wins in Royal Rum, a team total in
// Catchphrase, lives left in 31 — so TvMode just renders whatever order
// it's given rather than re-deriving it). Each row: { key, label, score,
// isLeader, color?, avatar?, photo? }. Omit color/avatar/photo for
// team rows (Catchphrase, Codenames, Euchre team variants) — the row
// still renders fine without a dot.
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
          <div className="tv-mode-overlay">
            <button type="button" className="tv-mode-close" onClick={() => setOpen(false)} aria-label="Exit TV mode">
              ✕
            </button>

            <div className="tv-mode-header">
              <div className="tv-mode-icon">{icon}</div>
              <h1 className="tv-mode-title">{gameName}</h1>
              {statusLine && <p className="tv-mode-status">{statusLine}</p>}
            </div>

            <div className="tv-mode-rows">
              {rows.map((r, i) => (
                <div key={r.key} className={`tv-mode-row ${r.isLeader ? "leader" : ""}`}>
                  <span className="tv-mode-rank">{r.isLeader ? "👑" : `${i + 1}`}</span>
                  {(r.color || r.avatar || r.photo) && (
                    <PlayerDot color={r.color} avatar={r.avatar} photo={r.photo} />
                  )}
                  <span className="tv-mode-name">{r.label}</span>
                  <span className={`tv-mode-score ${r.isLeader ? "leader" : ""}`}>
                    {r.score}
                    {unitLabel && <span className="tv-mode-unit">{unitLabel}</span>}
                  </span>
                </div>
              ))}
            </div>

            <p className="tv-mode-footer">Updates live as scores are entered — tap ✕ or press Esc to exit</p>
          </div>,
          document.body
        )}
    </>
  );
}
