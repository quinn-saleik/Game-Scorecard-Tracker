import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import OngoingGames from "../components/OngoingGames";
import { subscribeToCustomGames } from "../data/customGames";
import { submitFeedback } from "../data/feedback";

const GAMES = [
  { icon: "🂡", label: "Oh Heck!", path: "/oh-heck/setup", soon: false },
  { icon: "🔥", label: "Flip7", path: "/flip7/setup", soon: false },
  { icon: "♣", label: "Euchre", path: "/euchre", soon: false },
  { icon: "♦", label: "Royal Rum", path: "/royal-rum/setup", soon: false },
  { icon: "🎤", label: "Catchphrase", path: "/catchphrase/setup", soon: false },
  { icon: "🂱", label: "31", path: "/thirty-one/setup", soon: false },
  { icon: "♥", label: "Hearts", path: "/hearts/setup", soon: false },
  { icon: "♠", label: "Spades", path: "/spades/setup", soon: false },
  { icon: "⛳", label: "Golf", path: "/golf/setup", soon: false },
  { icon: "🎭", label: "Secret Hitler", path: "/secret-hitler/setup", soon: false },
  { icon: "🔺", label: "Dutch Blitz", path: "/dutch-blitz/setup", soon: false },
  { icon: "⚡", label: "Nertz", path: "/nertz/setup", soon: false },
  { icon: "🕵️", label: "Codenames", path: "/codenames/setup", soon: false },
  { icon: "✋", label: "Egyptian Ratscrew", path: "/egyptian-ratscrew/setup", soon: false },
  { icon: "🔢", label: "Skip-Bo", path: "/skip-bo/setup", soon: false },
  { icon: "🔟", label: "Phase 10", path: "/phase-10/setup", soon: false },
];

export default function Home() {
  const [customGames, setCustomGames] = useState([]);
  const [feedbackText, setFeedbackText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => subscribeToCustomGames(setCustomGames), []);

  async function handleSendFeedback(e) {
    e.preventDefault();
    if (!feedbackText.trim()) return;
    setSending(true);
    try {
      await submitFeedback(feedbackText);
      setFeedbackText("");
      setSent(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">
        <span className="suit black">♠</span> Pick a game
      </h1>
      <OngoingGames />
      <div className="game-grid">
        {GAMES.map((g) =>
          g.soon ? (
            <div className="game-tile disabled" key={g.label}>
              <span className="icon">{g.icon}</span>
              <span>{g.label}</span>
              <span className="soon">Coming soon</span>
            </div>
          ) : (
            <Link className="game-tile" to={g.path} key={g.label}>
              <span className="icon">{g.icon}</span>
              <span>{g.label}</span>
            </Link>
          )
        )}
        {/* Games someone made up through "Other" — saved so everyone sees
            the same tile with the same rules, instead of re-describing the
            game from scratch every time it comes up. */}
        {customGames.map((g) => (
          <Link className="game-tile" to={`/other/setup/${g.id}`} key={`custom-${g.id}`}>
            <span className="icon">{g.icon || "🃏"}</span>
            <span>{g.name}</span>
          </Link>
        ))}
        <Link className="game-tile" to="/other/setup" key="other-new">
          <span className="icon">➕</span>
          <span>New game</span>
        </Link>
      </div>

      <div className="card-surface" style={{ opacity: 0.85 }}>
        {sent ? (
          <p style={{ margin: 0, fontSize: 14 }}>
            Thanks — got it! 🙏{" "}
            <button
              type="button"
              onClick={() => setSent(false)}
              style={{ background: "none", border: "none", padding: 0, color: "var(--muted)", textDecoration: "underline", cursor: "pointer", fontSize: 14 }}
            >
              Send another
            </button>
          </p>
        ) : (
          <form onSubmit={handleSendFeedback}>
            <div className="field" style={{ marginBottom: 8 }}>
              <label htmlFor="feedback" style={{ fontSize: 13, color: "var(--muted)" }}>
                Have ideas or find a bug? Let me know!
              </label>
              <textarea
                id="feedback"
                className="input"
                rows={2}
                style={{ resize: "vertical", fontFamily: "inherit", fontSize: 14 }}
                placeholder="What's on your mind…"
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                disabled={sending}
              />
            </div>
            <button
              type="submit"
              className="btn ghost small"
              style={{ color: "var(--text-on-surface)", border: "2px solid var(--wood)" }}
              disabled={sending || !feedbackText.trim()}
            >
              {sending ? "Sending…" : "Send"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
