import { useState } from "react";
import { markTourSeen } from "../data/tourState";

const STEPS = [
  {
    icon: "🎉",
    title: "Welcome to Scorecard",
    body: "This is your family's shared game-night scorecard — everyone who opens this link sees the same players, games, and stats. No accounts, nothing to set up twice.",
  },
  {
    icon: "👪",
    title: "Add your players first",
    body: "Head to the Players tab and add everyone who'll play — a first and last name each, so two Rileys don't get mixed up. Tap a player's dot to give them a color, emoji, or photo.",
  },
  {
    icon: "🎲",
    title: "Tap a tile to start scoring",
    body: "Any game tile on the home screen jumps straight into a live scorecard. Don't see your game? Tap \"New game\" — name it once and it gets its own tile for everyone, forever.",
  },
  {
    icon: "📊",
    title: "Stats keep themselves",
    body: "Every finished game is logged automatically — win streaks, favorite games, head-to-head records, all on the Stats and Hall of Fame tabs. Nothing to type in twice.",
  },
  {
    icon: "📺",
    title: "One more thing",
    body: "Mid-game, tap \"TV mode\" on the scoreboard to blow it up big on a second phone or tablet — handy for propping up on the table so everyone can see the standings.",
  },
];

// Shown automatically once per device (see data/tourState.js), and
// re-openable anytime via the "?" button in the top bar (Layout.jsx). No
// backdrop-dismiss on purpose — a family member who's never used the app
// shouldn't be able to lose it with a stray tap outside the card.
export default function FirstRunTour({ onClose }) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  function finish() {
    markTourSeen();
    onClose();
  }

  return (
    <div
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
      <div className="card-surface" style={{ maxWidth: 420, width: "100%", margin: 0, textAlign: "center" }}>
        <div style={{ fontSize: 44, lineHeight: 1 }}>{current.icon}</div>
        <h2 style={{ marginTop: 12 }}>{current.title}</h2>
        <p style={{ color: "var(--text-on-surface)", fontSize: 15, lineHeight: 1.5 }}>{current.body}</p>

        <div style={{ display: "flex", justifyContent: "center", gap: 6, margin: "16px 0" }}>
          {STEPS.map((_, i) => (
            <span
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: i === step ? "var(--gold)" : "var(--divider)",
              }}
            />
          ))}
        </div>

        <div className="btn-row" style={{ justifyContent: "center" }}>
          {step > 0 && (
            <button
              type="button"
              className="btn ghost"
              style={{ color: "var(--text-on-surface)", border: "2px solid var(--wood)" }}
              onClick={() => setStep((s) => s - 1)}
            >
              ← Back
            </button>
          )}
          {!isLast && (
            <button type="button" className="btn ghost" style={{ color: "var(--muted)" }} onClick={finish}>
              Skip
            </button>
          )}
          <button type="button" className="btn primary" onClick={isLast ? finish : () => setStep((s) => s + 1)}>
            {isLast ? "Let's play!" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
