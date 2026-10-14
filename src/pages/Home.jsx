import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import OngoingGames from "../components/OngoingGames";
import { subscribeToCustomGames } from "../data/customGames";
import { subscribeToCompletedSessions } from "../data/gameSessions";
import FeedbackPopup from "../components/FeedbackPopup";
import { CHANGELOG, hasUnseenChangelog } from "../data/changelog";
import { splitTiles } from "../data/tileFolding";

// `family` picks the tile's color (see .fam-* in index.css): the four suits
// for card games, plus party / deduction / custom.
// `gameTypes` is every session.gameType this tile's plays should count
// toward — an array because the "Euchre" tile fans out to 5 real variants
// (2p/3p/traditional/15-card/partner) that all need to add up to one tile.
const GAMES = [
  { icon: "🎯", label: "Oh Heck!", family: "spade", path: "/oh-heck/setup", soon: false, gameTypes: ["oh-heck"] },
  { icon: "🔥", label: "Flip7", family: "heart", path: "/flip7/setup", soon: false, gameTypes: ["flip7"] },
  { icon: "🌽", label: "Euchre", family: "club", path: "/euchre", soon: false, gameTypes: ["euchre-2p", "euchre-3p", "euchre-traditional", "euchre-15card", "euchre-partner"] },
  { icon: "👑", label: "Royal Rum", family: "diamond", path: "/royal-rum/setup", soon: false, gameTypes: ["royal-rum"] },
  { icon: "🎤", label: "Catchphrase", family: "party", path: "/catchphrase/setup", soon: false, gameTypes: ["catchphrase"] },
  { icon: "🂱", label: "31", family: "heart", path: "/thirty-one/setup", soon: false, gameTypes: ["thirty-one"] },
  { icon: "⛳", label: "Golf", family: "club", path: "/golf/setup", soon: false, gameTypes: ["golf"] },
  { icon: "🎭", label: "Secret Hitler", family: "deduce", path: "/secret-hitler/setup", soon: false, gameTypes: ["secret-hitler"] },
  { icon: "🔺", label: "Dutch Blitz", family: "heart", path: "/dutch-blitz/setup", soon: false, gameTypes: ["dutch-blitz"] },
  { icon: "⚡", label: "Nertz", family: "club", path: "/nertz/setup", soon: false, gameTypes: ["nertz"] },
  { icon: "🕵️", label: "Codenames", family: "deduce", path: "/codenames/setup", soon: false, gameTypes: ["codenames"] },
  { icon: "✋", label: "Egyptian Ratscrew", family: "spade", path: "/egyptian-ratscrew/setup", soon: false, gameTypes: ["egyptian-ratscrew"] },
  { icon: "🔢", label: "Skip-Bo", family: "spade", path: "/skip-bo/setup", soon: false, gameTypes: ["skip-bo"] },
  { icon: "🔟", label: "Phase 10", family: "diamond", path: "/phase-10/setup", soon: false, gameTypes: ["phase-10"] },
];

export default function Home() {
  const [customGames, setCustomGames] = useState([]);
  const [completedSessions, setCompletedSessions] = useState([]);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

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

  // Most recent finished game per type / custom name — feeds the "More"
  // folding rule so a game someone just started playing again stays out of
  // it (see data/tileFolding.js).
  const lastPlayedByKey = useMemo(() => {
    const last = {};
    for (const s of completedSessions) {
      const d = s.completedAt?.toDate?.();
      if (!d) continue;
      const key = s.gameType === "other" ? `other:${s.config?.customName || "Other"}` : s.gameType;
      if (!last[key] || d > last[key]) last[key] = d;
    }
    return last;
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
      lastPlayedAt: g.gameTypes.reduce((best, gt) => {
        const d = lastPlayedByKey[gt];
        return d && (!best || d > best) ? d : best;
      }, null),
    }));
    const custom = customGames.map((g) => ({
      icon: g.icon || "🃏",
      label: g.name,
      path: `/other/setup/${g.id}`,
      soon: false,
      family: "custom",
      key: `custom-${g.id}`,
      playCount: playCountByCustomName[g.name] || 0,
      lastPlayedAt: lastPlayedByKey[`other:${g.name}`] || null,
    }));
    // Stable sort: builtin games keep their designed order among themselves
    // when tied, custom games keep their fetch order among themselves, and
    // only an actual play-count lead moves a tile up.
    return [...builtin, ...custom].sort((a, b) => b.playCount - a.playCount);
  }, [customGames, playCountByType, playCountByCustomName, lastPlayedByKey]);

  // Rarely-played games fold into a "More" section at the end; the rule
  // adapts to how much the family has actually played.
  const { main: mainTiles, more: moreTiles } = useMemo(() => splitTiles(sortedTiles), [sortedTiles]);

  const renderTile = (g) =>
    g.soon ? (
      <div className={`game-tile fam-${g.family} disabled`} key={g.key}>
        <span className="icon">{g.icon}</span>
        <span>{g.label}</span>
        <span className="soon">Coming soon</span>
      </div>
    ) : (
      <Link className={`game-tile fam-${g.family}`} to={g.path} key={g.key}>
        <span className="icon">{g.icon}</span>
        <span>{g.label}</span>
      </Link>
    );

  return (
    <div>
      <h1 className="page-title">
        <span className="suit black">♠</span> Pick a game
      </h1>
      <OngoingGames />
      <Link
        to="/whats-new"
        className="card-surface"
        style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "var(--text-on-surface)", padding: "10px 14px" }}
      >
        <span aria-hidden="true">✨</span>
        <span style={{ flex: 1, fontSize: 14 }}>
          <strong>What's new:</strong> {CHANGELOG[0].summary}
        </span>
        {hasUnseenChangelog() && (
          <span style={{ background: "var(--danger)", color: "#fff", borderRadius: 99, fontSize: 11, fontWeight: 700, padding: "2px 8px", letterSpacing: "0.05em" }}>NEW</span>
        )}
      </Link>
      <button
        type="button"
        className="card-surface"
        onClick={() => setFeedbackOpen(true)}
        style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", font: "inherit", cursor: "pointer", color: "var(--text-on-surface)", padding: "10px 14px" }}
      >
        <span aria-hidden="true">💬</span>
        <span style={{ flex: 1, fontSize: 14 }}>
          <strong>Tell me what you think!</strong>
        </span>
        <span aria-hidden="true" style={{ color: "var(--muted)" }}>›</span>
      </button>
      {feedbackOpen && <FeedbackPopup onClose={() => setFeedbackOpen(false)} />}
      <div className="game-grid">
        {/* Most-played first (ties keep their designed/fetch order — see
            sortedTiles above). Includes both the built-in games and any
            "Other" games someone's made up, saved so everyone sees the same
            tile with the same rules instead of re-describing the game from
            scratch every time it comes up. */}
        {mainTiles.map(renderTile)}
        <Link className="game-tile" to="/other/setup" key="other-new">
          <span className="icon">➕</span>
          <span>New game</span>
        </Link>
      </div>

      {moreTiles.length > 0 && (
        <details className="more-games">
          <summary>More games ({moreTiles.length})</summary>
          <div className="game-grid">{moreTiles.map(renderTile)}</div>
        </details>
      )}
    </div>
  );
}
