import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { subscribeToPlayers } from "../../../data/players";
import { createSession } from "../../../data/gameSessions";
import {
  subscribeToCustomGames,
  saveCustomGame,
  deleteCustomGame,
  slugifyGameName,
  DEFAULT_GAME_CONFIG,
} from "../../../data/customGames";
import OngoingGames from "../../../components/OngoingGames";
import PlayerDot from "../../../components/PlayerDot";
import { shortName } from "../../../data/playerNames";
import GameInstructions from "../../../components/GameInstructions";

const GAME_ICONS = ["🃏", "🎲", "🎯", "🀄", "♟️", "🎳", "🧩", "🎱", "🎮", "🀫"];

export default function OtherSetup() {
  const { gameId } = useParams();
  const navigate = useNavigate();

  const [players, setPlayers] = useState([]);
  const [customGames, setCustomGames] = useState([]);
  const [customGamesLoaded, setCustomGamesLoaded] = useState(false);
  const [selected, setSelected] = useState([]);

  const [gameName, setGameName] = useState("");
  const [icon, setIcon] = useState(GAME_ICONS[0]);
  const [direction, setDirection] = useState(DEFAULT_GAME_CONFIG.scoreDirection);
  const [startingScore, setStartingScore] = useState(String(DEFAULT_GAME_CONFIG.startingScore));
  const [targetScore, setTargetScore] = useState("");
  const [bidding, setBidding] = useState(DEFAULT_GAME_CONFIG.bidding);
  const [editingRules, setEditingRules] = useState(!gameId);

  const [starting, setStarting] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => subscribeToPlayers((list) => setPlayers(list)), []);
  useEffect(
    () =>
      subscribeToCustomGames((list) => {
        setCustomGames(list);
        setCustomGamesLoaded(true);
      }),
    []
  );

  const active = players.filter((p) => p.active);
  const loadedGame = gameId ? customGames.find((g) => g.id === gameId) : null;
  const notFound = Boolean(gameId) && customGamesLoaded && !loadedGame;
  const loading = Boolean(gameId) && !customGamesLoaded;

  // Landed here via a Home-screen tile for an existing custom game —
  // prefill everything from its saved rules and lock the name/icon.
  useEffect(() => {
    if (!loadedGame) return;
    setGameName(loadedGame.name);
    setIcon(loadedGame.icon || GAME_ICONS[0]);
    setDirection(loadedGame.config?.scoreDirection || DEFAULT_GAME_CONFIG.scoreDirection);
    setStartingScore(String(loadedGame.config?.startingScore ?? DEFAULT_GAME_CONFIG.startingScore));
    setTargetScore(loadedGame.config?.targetScore != null ? String(loadedGame.config.targetScore) : "");
    setBidding(Boolean(loadedGame.config?.bidding));
  }, [loadedGame?.id]);

  // Creating a fresh game, but the typed name matches one that already
  // exists (any capitalization) — reuse its rules instead of quietly
  // forking a second rule set under the same name.
  const nameMatch = !gameId ? customGames.find((g) => g.id === slugifyGameName(gameName)) : null;
  useEffect(() => {
    if (!nameMatch) return;
    setIcon(nameMatch.icon || GAME_ICONS[0]);
    setDirection(nameMatch.config?.scoreDirection || DEFAULT_GAME_CONFIG.scoreDirection);
    setStartingScore(String(nameMatch.config?.startingScore ?? DEFAULT_GAME_CONFIG.startingScore));
    setTargetScore(nameMatch.config?.targetScore != null ? String(nameMatch.config.targetScore) : "");
    setBidding(Boolean(nameMatch.config?.bidding));
  }, [nameMatch?.id]);

  function toggle(id) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  const effectiveName = gameId ? loadedGame?.name || "" : gameName;
  const ready = effectiveName.trim().length > 0 && selected.length >= 2 && !loading;

  async function handleStart() {
    if (!ready) return;
    setStarting(true);
    try {
      const config = {
        customName: effectiveName.trim(),
        icon,
        scoreDirection: direction,
        startingScore: Number(startingScore) || 0,
        targetScore: targetScore.trim() === "" ? null : Number(targetScore),
        bidding,
      };
      // Persist/refresh the reusable rules so this game keeps showing up
      // on Home for everyone, whether it's brand-new or just re-tuned.
      await saveCustomGame(effectiveName, config, icon);

      const sessionPlayers = active
        .filter((p) => selected.includes(p.id))
        .map((p) => ({ id: p.id, name: p.name, color: p.color || null, avatar: p.avatar || null, photo: p.photo || null }));
      const id = await createSession({
        gameType: "other",
        gameLabel: effectiveName.trim(),
        players: sessionPlayers,
        config,
        initialTotals: Object.fromEntries(sessionPlayers.map((p) => [p.id, config.startingScore])),
      });
      navigate(`/other/play/${id}`);
    } finally {
      setStarting(false);
    }
  }

  async function handleRemove() {
    if (!loadedGame) return;
    if (
      !window.confirm(
        `Remove "${loadedGame.name}" from the home screen? Games already played under this name keep their spot in Stats — this just takes the tile away and stops new games from reusing these rules.`
      )
    )
      return;
    setRemoving(true);
    try {
      await deleteCustomGame(loadedGame.id);
      navigate("/");
    } finally {
      setRemoving(false);
    }
  }

  if (notFound) {
    return (
      <div>
        <h1 className="page-title">
          <span className="suit black">🃏</span> Game not found
        </h1>
        <div className="card-surface">
          <p className="empty-state">This game may have been removed from the home screen.</p>
          <Link className="btn primary" to="/">Back to games</Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">
        <span className="suit black">{icon}</span> {effectiveName ? `${effectiveName} — Set up` : "Other — Set up"}
      </h1>
      <OngoingGames gameType="other" customName={effectiveName || undefined} />

      <GameInstructions players="2+ players">
        <p style={{ margin: "0 0 10px" }}>
          <strong>For any game without a dedicated scorecard.</strong> Name it once and it gets
          its own tile on the home screen for everyone — next time, just tap it instead of
          re-describing the game.
        </p>
        <p style={{ margin: "0 0 10px" }}>
          <strong>Rules:</strong> choose whether higher or lower wins, optionally give it a
          winning score to end the game automatically, and optionally track a bid alongside each
          round's score.
        </p>
        <p style={{ margin: 0 }}>
          <strong>Scoring:</strong> with no winning score set, hit "Finish game" whenever you're
          done and choose the winner(s) yourself. Games with the same name (any capitalization)
          share one tile and are grouped together in Stats.
        </p>
      </GameInstructions>

      {loading ? (
        <p className="empty-state">Loading…</p>
      ) : (
        <>
          {!gameId && (
            <div className="card-surface">
              <h2>Game name</h2>
              <div className="field">
                <label htmlFor="gameName">What are you playing?</label>
                <input
                  id="gameName"
                  className="input"
                  placeholder="e.g. Poker, Yahtzee, Rummy…"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                />
              </div>
              {nameMatch ? (
                <p style={{ color: "var(--muted)", fontSize: 13 }}>
                  Matches the existing "{nameMatch.name}" tile — reusing its rules below.
                </p>
              ) : (
                <p style={{ color: "var(--muted)", fontSize: 13 }}>
                  Saving this adds a "{gameName.trim() || "…"}" tile to the home screen for
                  everyone.
                </p>
              )}
              <div className="field">
                <label>Icon</label>
                <div className="chip-row">
                  {GAME_ICONS.map((em) => (
                    <span
                      key={em}
                      className={`player-chip ${icon === em ? "selected" : ""}`}
                      onClick={() => setIcon(em)}
                      style={{ fontSize: 18, padding: "6px 12px" }}
                    >
                      {em}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {gameId && loadedGame && (
            <div className="card-surface">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <h2 style={{ margin: 0 }}>
                  {icon} {loadedGame.name}
                </h2>
                <span className="btn-row">
                  <button
                    type="button"
                    className="btn ghost small"
                    style={{ color: "var(--text-on-surface)", border: "2px solid var(--wood)" }}
                    onClick={() => setEditingRules((v) => !v)}
                  >
                    {editingRules ? "Hide rules" : "✎ Edit rules"}
                  </button>
                  <button
                    type="button"
                    className="btn danger small"
                    onClick={handleRemove}
                    disabled={removing}
                  >
                    {removing ? "Removing…" : "🗑 Remove"}
                  </button>
                </span>
              </div>
            </div>
          )}

          {editingRules && (
            <div className="card-surface">
              <h2>Rules</h2>
              <div className="field">
                <label>Which way does scoring count?</label>
                <div className="btn-row">
                  <button
                    type="button"
                    className={`btn small ${direction === "up" ? "primary" : "ghost"}`}
                    style={direction !== "up" ? { color: "var(--text-on-surface)", border: "2px solid var(--wood)" } : undefined}
                    onClick={() => setDirection("up")}
                  >
                    ⬆ Count up — highest wins
                  </button>
                  <button
                    type="button"
                    className={`btn small ${direction === "down" ? "primary" : "ghost"}`}
                    style={direction !== "down" ? { color: "var(--text-on-surface)", border: "2px solid var(--wood)" } : undefined}
                    onClick={() => setDirection("down")}
                  >
                    ⬇ Count down — lowest wins
                  </button>
                </div>
              </div>

              <div className="field">
                <label htmlFor="startingScore">Starting score</label>
                <input
                  id="startingScore"
                  className="input"
                  type="number"
                  value={startingScore}
                  onChange={(e) => setStartingScore(e.target.value)}
                />
                <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>
                  {direction === "down"
                    ? "E.g. start everyone at 500 and count down."
                    : "Usually 0 — raise it to give a head start or handicap."}
                </p>
              </div>

              <div className="field">
                <label htmlFor="targetScore">Winning score (optional)</label>
                <input
                  id="targetScore"
                  className="input"
                  type="number"
                  placeholder="No limit — finish manually"
                  value={targetScore}
                  onChange={(e) => setTargetScore(e.target.value)}
                />
                <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>
                  {targetScore.trim() !== ""
                    ? direction === "down"
                      ? `Game flags itself once someone's total drops to ${targetScore} or below.`
                      : `Game flags itself once someone's total reaches ${targetScore}.`
                    : "Leave blank to just play until someone taps \"Finish game\"."}
                </p>
              </div>

              <div className="field">
                <label>Track a bid each round?</label>
                <div className="btn-row">
                  <button
                    type="button"
                    className={`btn small ${bidding ? "primary" : "ghost"}`}
                    style={!bidding ? { color: "var(--text-on-surface)", border: "2px solid var(--wood)" } : undefined}
                    onClick={() => setBidding(true)}
                  >
                    Bidding: On
                  </button>
                  <button
                    type="button"
                    className={`btn small ${!bidding ? "primary" : "ghost"}`}
                    style={bidding ? { color: "var(--text-on-surface)", border: "2px solid var(--wood)" } : undefined}
                    onClick={() => setBidding(false)}
                  >
                    Bidding: Off
                  </button>
                </div>
                <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>
                  Adds a bid field next to each player's score every round — recorded for
                  reference, not auto-scored (bid-to-score math varies too much game to game).
                </p>
              </div>
            </div>
          )}

          <div className="card-surface">
            <h2>Select players ({selected.length} selected)</h2>
            {active.length === 0 ? (
              <p className="empty-state">No active players. Add some on the Players tab first.</p>
            ) : (
              <div className="chip-row">
                {active.map((p) => (
                  <span
                    key={p.id}
                    className={`player-chip ${selected.includes(p.id) ? "selected" : ""}`}
                    onClick={() => toggle(p.id)}
                  >
                    <PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />
                    {shortName(p)}
                  </span>
                ))}
              </div>
            )}
          </div>

          <button className="btn primary" disabled={!ready || starting} onClick={handleStart}>
            {starting ? "Starting…" : "Start game"}
          </button>
          {!ready && (
            <p className="empty-state">
              {effectiveName.trim() ? "Pick at least 2 players to start." : "Name the game and pick at least 2 players to start."}
            </p>
          )}
        </>
      )}
    </div>
  );
}
