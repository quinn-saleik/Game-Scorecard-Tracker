import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import OngoingGames from "../components/OngoingGames";
import { subscribeToCustomGames } from "../data/customGames";
import { subscribeToCompletedSessions } from "../data/gameSessions";
import { submitFeedback } from "../data/feedback";

// `gameTypes` is every session.gameType this tile's plays should count
// toward — an array because the "Euchre" tile fans out to 5 real variants
// (2p/3p/traditional/15-card/partner) that all need to add up to one tile.
const GAMES = [
  { icon: "🂡", label: "Oh Heck!", path: "/oh-heck/setup", soon: false, gameTypes: ["oh-heck"] },
  { icon: "🔥", label: "Flip7", path: "/flip7/setup", soon: false, gameTypes: ["flip7"] },
  { icon: "♣", label: "Euchre", path: "/euchre", soon: false, gameTypes: ["euchre-2p", "euchre-3p", "euchre-traditional", "euchre-15card", "euchre-partner"] },
  { icon: "♦", label: "Royal Rum", path: "/royal-rum/setup", soon: false, gameTypes: ["royal-rum"] },
  { icon: "🎤", label: "Catchphrase", path: "/catchphrase/setup", soon: false, gameTypes: ["catchphrase"] },
  { icon: "🂱", label: "31", path: "/thirty-one/setup", soon: false, gameTypes: ["thirty-one"] },
  { icon: "♥", label: "Hearts", path: "/hearts/setup", soon: false, gameTypes: ["hearts"] },
  { icon: "♠", label: "Spades", path: "/spades/setup", soon: false, gameTypes: ["spades"] },
  { icon: "⛳", label: "Golf", path: "/golf/setup", soon: false, gameTypes: ["golf"] },
  { icon: "🎭", label: "Secret Hitler", path: "/secret-hitler/setup", soon: false, gameTypes: ["secret-hitler"] },
  { icon: "🔺", label: "Dutch Blitz", path: "/dutch-blitz/setup", soon: false, gameTypes: ["dutch-blitz"] },
  { icon: "⚡", label: "Nertz", path: "/nertz/setup", soon: false, gameTypes: ["nertz"] },
  { icon: "🕵️", label: "Codenames", path: "/codenames/setup", soon: false, gameTypes: ["codenames"] },
  { icon: "✋", label: "Egyptian Ratscrew", path: "/egyptian-ratscrew/setup", soon: false, gameTypes: ["egyptian-ratscrew"] },
  { icon: "🔢", label: "Skip-Bo", path: "/skip-bo/setup", soon: false, gameTypes: ["skip-bo"] },
  { icon: "🔟", label: "Phase 10", path: "/phase-10/setup", soon: false, gameTypes: ["phase-10"] },
];

export default function Home() {
  const [customGames, setCustomGames] = useState([]);
  const [completedSessions, setCompletedSessions] = useState([]);
  const [feedbackText, setFeedbackText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => subscribeToCustomGames(setCustomGames), []);
  useEffect(() => subscribeToCompletedSessions(setCompletedSessions), []);

  // Most-played first. Ties (including everyone at 0 plays, e.g. right
  // after adding new games — "understanding there's no play data yet") keep
  // their original order instead of jumping around: Array.prototype.sort is
  // stable, so a plain descending sort by count alone does exactly that.
  const playCountByType = useMemo(() => {
    const counts = {};
    for (const s of completedSessions) {
      counts[s.gameType] = (counts[s.gameType] || 0) + 1;
    }
    return counts;
  }, [completedSessions]);

  // Every "Other" custom game shares the literal gameType "other" in
  // Firestore, so they can't be told apart by gameType alone — count each
  // one by matching its own saved name instead (same distinction Stats
  // already makes via gameGroupKey in data/stats.js).
  const playCountByCustomName = useMemo(() => {
    const counts = {};
    for (const s of completedSessions) {
      if (s.gameType !== "other") continue;
      const name = s.config?.customName || "Other";
      counts[name] = (counts[name] || 0) + 1;
    }
    return counts;
  }, [completedSessions]);

  const sortedTiles = useMemo(() => {
    const builtin = GAMES.map((g) => ({
      ...g,
      key: g.label,
      playCount: g.gameTypes.reduce((sum, gt) => sum + (playCountByType[gt] || 0), 0),
    }));
    const custom = customGames.map((g) => ({
      icon: g.icon || "🃏",
      label: g.name,
      path: `/other/setup/${g.id}`,
      soon: false,
      key: `custom-${g.id}`,
      playCount: playCountByCustomName[g.name] || 0,
    }));
    // Stable sort: builtin games keep their designed order among themselves
    // when tied, custom games keep their fetch order among themselves, and
    // only an actual play-count lead moves a tile up.
    return [...builtin, ...custom].sort((a, b) => b.playCount - a.playCount);
  }, [customGames, playCountByType, playCountByCustomName]);

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
        {/* Most-played first (ties keep their designed/fetch order — see
            sortedTiles above). Includes both the built-in games and any
            "Other" games someone's made up, saved so everyone sees the same
            tile with the same rules instead of re-describing the game from
            scratch every time it comes up. */}
        {sortedTiles.map((g) =>
          g.soon ? (
            <div className="game-tile disabled" key={g.key}>
              <span className="icon">{g.icon}</span>
              <span>{g.label}</span>
              <span className="soon">Coming soon</span>
            </div>
          ) : (
            <Link className="game-tile" to={g.path} key={g.key}>
              <span className="icon">{g.icon}</span>
              <span>{g.label}</span>
            </Link>
          )
        )}
        <Link className="game-tile" to="/other/setup" key="other-new">
          <span className="icon">➕</span>
          <span>New game</span>
        </Link>
      </div>

      <div className="card-surface" style={{ opacity: 0.85, marginTop: 28 }}>
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
