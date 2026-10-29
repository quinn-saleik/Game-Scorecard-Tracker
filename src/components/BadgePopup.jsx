import { useEffect } from "react";
import PlayerDot from "./PlayerDot";
import { shortName } from "../data/playerNames";
import { groupBadgesByPlayer } from "../data/newBadges";

// "Doug earned 🔥 Hot Streak" — shown when a finished game unlocked
// achievements. Tap anywhere or "Nice!" to dismiss.
export default function BadgePopup({ items, onClose }) {
  const groups = groupBadgesByPlayer(items);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="New achievements"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        background: "rgba(16, 22, 31, 0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        className="card-surface"
        style={{ maxWidth: 420, width: "100%", margin: 0, maxHeight: "85vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ textAlign: "center", fontSize: 44, lineHeight: 1 }}>🏅</div>
        <h2 style={{ textAlign: "center", marginTop: 12 }}>New achievements!</h2>
        {groups.map(({ player, badges }) => (
          <div key={player.id} style={{ margin: "14px 0" }}>
            <p style={{ fontWeight: 700, margin: "0 0 6px" }}>
              <PlayerDot color={player.color} avatar={player.avatar} photo={player.photo} />
              {shortName(player)}
            </p>
            {badges.map((b) => (
              <p key={b.id} style={{ margin: "4px 0 4px 22px", fontSize: 15 }}>
                <span style={{ fontSize: 20 }}>{b.emoji}</span> <strong>{b.label}</strong>
                <span style={{ color: "var(--muted)" }}> — {b.description}</span>
              </p>
            ))}
          </div>
        ))}
        <div className="btn-row" style={{ justifyContent: "center" }}>
          <button type="button" className="btn primary" onClick={onClose} autoFocus>
            Nice!
          </button>
        </div>
      </div>
    </div>
  );
}
