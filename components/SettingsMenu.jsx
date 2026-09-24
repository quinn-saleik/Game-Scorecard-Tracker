import { useState } from "react";
import { getPreferences, savePreferences, applyPreferences } from "../data/preferences";

const TEXT_SIZE_LABELS = { normal: "Normal", large: "Large", xlarge: "Extra large" };

export default function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState(getPreferences);

  function update(partial) {
    const next = { ...prefs, ...partial };
    setPrefs(next);
    savePreferences(next);
    applyPreferences(next);
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        className="btn ghost small"
        style={{
          padding: "6px 9px",
          minHeight: "auto",
          border: "1px solid rgba(238, 241, 246, 0.3)",
          borderRadius: 10,
          fontSize: 15,
          lineHeight: 1,
        }}
        onClick={() => setOpen((o) => !o)}
        aria-label="Display settings"
      >
        ⚙️
      </button>
      {open && (
        <>
          {/* Full-screen click-catcher to close the panel on outside tap. */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 20 }}
          />
          <div
            className="card-surface"
            style={{
              position: "absolute",
              right: 0,
              top: "calc(100% + 8px)",
              width: 220,
              zIndex: 21,
              margin: 0,
            }}
          >
            <h2 style={{ fontSize: 15 }}>Display</h2>
            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: -6 }}>Theme</p>
            <div className="chip-row" style={{ marginBottom: 12 }}>
              {["light", "dark"].map((t) => (
                <span
                  key={t}
                  className={`player-chip ${prefs.theme === t ? "selected" : ""}`}
                  onClick={() => update({ theme: t })}
                  style={{ padding: "6px 12px", fontSize: 13 }}
                >
                  {t === "light" ? "☀️ Light" : "🌙 Dark"}
                </span>
              ))}
            </div>
            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 0 }}>Text size</p>
            <div className="chip-row">
              {Object.entries(TEXT_SIZE_LABELS).map(([size, label]) => (
                <span
                  key={size}
                  className={`player-chip ${prefs.textSize === size ? "selected" : ""}`}
                  onClick={() => update({ textSize: size })}
                  style={{ padding: "6px 12px", fontSize: 13 }}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
