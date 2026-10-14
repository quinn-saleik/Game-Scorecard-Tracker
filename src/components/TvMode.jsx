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
// The scoreboard is the point, so the game name/icon/status live in a
// small, muted topbar rather than a full title block — every pixel not
// spent on names and scores is space the back row of the couch can't
// read. There's no footer either; the ✕ button is the only "how do I
// leave" affordance needed.
//
// rows: pre-sorted best-to-worst by the caller (every game's "who's
// winning" rule is different — lowest wins in Royal Rum, a team total in
// Catchphrase, lives left in 31 — so TvMode just renders whatever order
// it's given rather than re-deriving it). Each row: { key, label, score,
// isLeader, color?, avatar?, photo? }. Omit color/avatar/photo for
// team rows (Catchphrase, Codenames, Euchre team variants) — the row
// still renders fine without a dot.
//
// Optional per-row extras (all structured, so layout stays consistent
// instead of cramming text into the name):
//   dealer: true                yellow card pin on the top-right of the avatar
//   badges: [{ text, tone? }]  small pills by the name ("🃏 Dealer",
//                               "Bidding…"); tone: "accent" | "good"
//   pips:   [{ label, done, current? }]  a checklist strip under the name
//                               (Phase 10 phases, Royal Rum goals); done =
//                               green, current = yellow
//   chip:   { label, value, tone? }  big pill by the score (Oh Heck bid)
//   sub:    string              one muted line under the name

//
// A tablet/phone propped up sideways has width to spare, so past a
// handful of players the rows split into two CSS-multicolumn columns in
// landscape (`.tv-mode-rows.two-col`) instead of one long scrollable list
// — with only a few players a single column already fits and looks less
// sparse than two half-empty ones.
const TWO_COL_THRESHOLD = 5;

function TvAvatar({ color, avatar, photo }) {
  if (photo) {
    return <img className="tv-avatar" src={photo} alt="" aria-hidden="true" style={{ borderColor: color || "rgba(255,255,255,0.35)" }} />;
  }
  if (avatar || color) {
    return (
      <span className="tv-avatar" aria-hidden="true" style={{ background: color || "rgba(255,255,255,0.15)" }}>
        {avatar}
      </span>
    );
  }
  return null;
}

// Avatar (or, for team rows with none, just the rank) with a small rank
// pin in the corner — crown for the leader. Keeps rank visible without
// spending a whole column of width on it.
function TvMarker({ rank, leader, dealer, color, avatar, photo }) {
  const hasAvatar = !!(color || avatar || photo);
  return (
    <span className={`tv-marker ${hasAvatar ? "" : "no-avatar"}`}>
      {hasAvatar && <TvAvatar color={color} avatar={avatar} photo={photo} />}
      <span className={`tv-rankpin ${leader ? "leader" : ""}`}>{leader ? "👑" : rank}</span>
      {dealer && <span className="tv-dealerpin" title="Dealer" role="img" aria-label="Dealer">🃏</span>}
    </span>
  );
}

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

            <div className="tv-mode-topbar">
              <span className="tv-mode-topbar-icon">{icon}</span>
              <span className="tv-mode-topbar-title">{gameName}</span>
              {statusLine && <span className="tv-mode-topbar-status">{statusLine}</span>}
            </div>

            <div
              className={`tv-mode-rows ${rows.length >= TWO_COL_THRESHOLD ? "two-col" : ""} ${rows.length <= 3 ? "few" : ""}`}
              style={{ "--tv-half": Math.ceil(rows.length / 2) }}
            >
              {rows.map((r, i) => {
                const extras = !!(r.sub || r.chip || (r.badges && r.badges.length));
                return (
                  <div
                    key={r.key}
                    className={`tv-mode-row ${r.isLeader ? "leader" : ""} ${extras || r.pips ? "has-extras" : ""}`}
                    style={{
                      "--name-len": Math.max(String(r.label || "").length, 1),
                      "--score-len": Math.max(String(r.score ?? "").length, 1),
                    }}
                  >
                    <TvMarker rank={i + 1} leader={r.isLeader} dealer={r.dealer} color={r.color} avatar={r.avatar} photo={r.photo} />
                    <div className="tv-mode-id">
                      <span className="tv-mode-name">{r.label}</span>
                      {extras && (
                        <div className="tv-mode-extras">
                          {(r.badges || []).map((bd, bi) => (
                            <span key={bi} className={`tv-mode-badge ${bd.tone || ""}`}>{bd.text}</span>
                          ))}
                          {r.chip && (
                            <span className={`tv-mode-chip ${r.chip.tone || ""}`}>
                              <span className="tv-mode-chip-label">{r.chip.label}</span>
                              <span className="tv-mode-chip-value">{r.chip.value}</span>
                            </span>
                          )}
                          {r.sub && <span className="tv-mode-sub">{r.sub}</span>}
                        </div>
                      )}
                      {r.pips && (
                        <div className="tv-mode-pips" aria-hidden="true">
                          {r.pips.map((pp, pi) => (
                            <span key={pi} className={`tv-mode-pip ${pp.done ? "done" : ""} ${pp.current ? "current" : ""}`}>{pp.label}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="tv-mode-scorebox">
                      <span className={`tv-mode-score ${r.isLeader ? "leader" : ""}`}>
                        {r.score}
                        {unitLabel && <span className="tv-mode-unit">{unitLabel}</span>}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
