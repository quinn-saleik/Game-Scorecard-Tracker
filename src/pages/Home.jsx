import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import OngoingGames from "../components/OngoingGames";
import { subscribeToCustomGames, slugifyGameName } from "../data/customGames";
import { subscribeToPlayers, setPlayerFavoriteGames } from "../data/players";
import { useWhoamiId } from "../data/whoami";
import { subscribeToCompletedSessions } from "../data/gameSessions";
import FeedbackPopup from "../components/FeedbackPopup";
import { wrappedYear } from "../data/wrappedGate";
import { CHANGELOG, hasUnseenChangelog } from "../data/changelog";
import { newFirst, isNewGame } from "../data/newGames";
import { resolveFavoriteKeys, splitByFavorites, toggleFavoriteKey } from "../data/gameFavorites";

// Starred games for a device nobody has signed in on.
const DEVICE_FAVS_KEY = "scorecard:favorite-games";
function readDeviceFavs() {
  try {
    const v = JSON.parse(localStorage.getItem(DEVICE_FAVS_KEY));
    return Array.isArray(v) ? v : undefined;
  } catch {
    return undefined;
  }
}

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
  const [players, setPlayers] = useState([]);
  const [deviceFavs, setDeviceFavs] = useState(readDeviceFavs);
  const whoamiId = useWhoamiId();

  useEffect(() => subscribeToCustomGames(setCustomGames), []);
  useEffect(() => subscribeToPlayers(setPlayers), []);
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

  // Which tile each finished game belongs to, so a person's own plays can
  // pre-star their most-played games (see data/gameFavorites.js).
  const tileKeyByType = useMemo(() => {
    const m = {};
    for (const g of GAMES) for (const gt of g.gameTypes) m[gt] = g.label;
    return m;
  }, []);
  const personalCounts = useMemo(() => {
    const counts = {};
    if (!whoamiId) return counts;
    for (const s of completedSessions) {
      if (!(s.players || []).some((p) => p.id === whoamiId)) continue;
      const key = s.gameType === "other" ? `custom-${slugifyGameName(s.config?.customName)}` : tileKeyByType[s.gameType];
      if (key) counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [completedSessions, whoamiId, tileKeyByType]);

  const me = whoamiId ? players.find((p) => p.id === whoamiId) : null;
  // Signed in: saved on your player. Not signed in: saved on this device.
  const storedFavs = whoamiId ? me?.favoriteGameIds : deviceFavs;
  const favoriteKeys = useMemo(
    () => resolveFavoriteKeys(sortedTiles, storedFavs, personalCounts),
    [sortedTiles, storedFavs, personalCounts]
  );
  // Starred games on the main grid, everything else in "More games". Within
  // each, your own most-played first, then the family's.
  const { main: mainTiles, more: moreTiles } = useMemo(() => {
    const ordered = [...sortedTiles].sort((a, b) => (personalCounts[b.key] || 0) - (personalCounts[a.key] || 0));
    // Newly added games lead the main grid for a while, starred or not.
    const { fresh, rest } = newFirst(ordered);
    const split = splitByFavorites(rest, favoriteKeys);
    return { main: [...fresh, ...split.main], more: split.more };
  }, [sortedTiles, personalCounts, favoriteKeys]);

  function toggleStar(key) {
    const next = toggleFavoriteKey(favoriteKeys, key);
    if (whoamiId) {
      if (me) setPlayerFavoriteGames(me.id, next).catch((e) => console.error("saving starred games failed:", e));
    } else {
      setDeviceFavs(next);
      try {
        localStorage.setItem(DEVICE_FAVS_KEY, JSON.stringify(next));
      } catch {
        /* storage blocked — the stars still work until reload */
      }
    }
  }

  const renderTile = (g) => {
    const starred = favoriteKeys.includes(g.key);
    return (
      <div className="tile-wrap" key={g.key}>
        {isNewGame(g.key) && (
          <span className="tile-ribbon" aria-label="New game">
            <span aria-hidden="true">NEW</span>
          </span>
        )}
        {g.soon ? (
          <div className={`game-tile fam-${g.family} disabled`}>
            <span className="icon">{g.icon}</span>
            <span>{g.label}</span>
            <span className="soon">Coming soon</span>
          </div>
        ) : (
          <Link className={`game-tile fam-${g.family}`} to={g.path}>
            <span className="icon">{g.icon}</span>
            <span>{g.label}</span>
          </Link>
        )}
        <button
          type="button"
          className={`tile-star ${starred ? "on" : ""}`}
          aria-pressed={starred}
          aria-label={starred ? `Unstar ${g.label}` : `Star ${g.label}`}
          onClick={() => toggleStar(g.key)}
        >
          {starred ? "★" : "☆"}
        </button>
      </div>
    );
  };

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
      {wrappedYear() && (
        <Link
          to="/wrapped"
          className="card-surface wrapped-banner"
          style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "var(--text-on-surface)", padding: "10px 14px" }}
        >
          <span aria-hidden="true">🎁</span>
          <span style={{ flex: 1, fontSize: 14 }}>
            <strong>Your {wrappedYear()} Scorecard Wrapped is here!</strong>
          </span>
          <span aria-hidden="true" style={{ color: "var(--muted)" }}>›</span>
        </Link>
      )}
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
        {/* Starred games, your most-played first. Includes the built-in games
            and any custom ones someone's made, saved so everyone sees the
            same tile with the same rules. "New game" is always here. */}
        {mainTiles.map(renderTile)}
        <div className="tile-wrap" key="other-new">
          <Link className="game-tile" to="/other/setup">
            <span className="icon">➕</span>
            <span>New game</span>
          </Link>
        </div>
      </div>
      {!Array.isArray(storedFavs) && (
        <p className="star-hint">☆ Tap a star to pin a game up here. These are your most played to start.</p>
      )}

      {moreTiles.length > 0 && (
        <details className="more-games">
          <summary>More games ({moreTiles.length})</summary>
          <div className="game-grid">{moreTiles.map(renderTile)}</div>
        </details>
      )}
    </div>
  );
}
