import { useEffect } from "react";
import FavoritesPicker from "./FavoritesPicker";

// Popup around FavoritesPicker, opened from the Favorites tile in the Me tab's
// Identity section. Backdrop tap, Escape or Done closes it; changes save as
// each chip is tapped, so there's nothing to confirm.
export default function FavoritesPopup({ player, players, onClose }) {
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
      aria-label="Favorites"
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
      <div className="card-surface" style={{ maxWidth: 420, width: "100%", margin: 0 }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>⭐ Favorites</h2>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: -6 }}>
          Star the people you usually play with. Player pickers, Stats, and the Hall of Fame show just you and your
          favorites. Pick nobody to see everyone, or tap "Everyone" on any of those screens for a quick look at the full list.
        </p>
        <FavoritesPicker player={player} players={players} />
        <div className="btn-row" style={{ marginTop: 14, justifyContent: "flex-end" }}>
          <button type="button" className="btn primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
