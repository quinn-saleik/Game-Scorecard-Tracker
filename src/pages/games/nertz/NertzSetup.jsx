import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { subscribeToPlayers } from "../../../data/players";
import { createSession } from "../../../data/gameSessions";
import OngoingGames from "../../../components/OngoingGames";
import PlayerDot from "../../../components/PlayerDot";
import { shortName } from "../../../data/playerNames";
import GameInstructions from "../../../components/GameInstructions";

export default function NertzSetup() {
  const [players, setPlayers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [threshold, setThreshold] = useState(100);
  const [starting, setStarting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => subscribeToPlayers((list) => setPlayers(list)), []);

  const active = players.filter((p) => p.active);

  function toggle(id) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function handleStart() {
    if (selected.length < 2) return;
    setStarting(true);
    try {
      const sessionPlayers = active
        .filter((p) => selected.includes(p.id))
        .map((p) => ({ id: p.id, name: p.name, color: p.color || null, avatar: p.avatar || null, photo: p.photo || null }));
      const id = await createSession({
        gameType: "nertz",
        gameLabel: "Nertz",
        players: sessionPlayers,
        config: { winThreshold: Number(threshold) || 100 },
      });
      navigate(`/nertz/play/${id}`);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">
        <span className="suit red">⚡</span> Nertz — Who's playing?
      </h1>
      <OngoingGames gameType="nertz" />

      <GameInstructions players="2-6 players">
        <p style={{ margin: "0 0 10px" }}>
          <strong>Objective:</strong> Be the first to empty your own 13-card Nertz pile.
        </p>
        <p style={{ margin: "0 0 10px" }}>
          <strong>How to play:</strong> Everyone plays with their own standard deck at once, no
          turns. Flip cards from your Nertz pile into a hand of three, and race to build shared
          foundation piles in the middle — each suit starts at ace and climbs in order. Play from
          your Nertz pile, your own tableau of four face-up piles (built down in alternating
          colors), or your hand of three whenever you've got a legal move. A hand ends the instant
          someone empties their Nertz pile and calls "Nertz!"
        </p>
        <p style={{ margin: 0 }}>
          <strong>Scoring:</strong> When a hand ends, everyone counts +1 for each of their own
          cards on the foundations, and -2 for each card still left in their Nertz pile. Enter
          that net total here for the hand. First to reach the target after a completed hand wins.
        </p>
      </GameInstructions>

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

      <div className="card-surface">
        <h2>Winning score</h2>
        <div className="field">
          <label htmlFor="threshold">Points to win</label>
          <input
            id="threshold"
            className="input"
            type="number"
            min="1"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
          />
        </div>
      </div>

      <button className="btn primary" disabled={selected.length < 2 || starting} onClick={handleStart}>
        {starting ? "Starting…" : "Start game"}
      </button>
      {selected.length < 2 && <p className="empty-state">Pick at least 2 players to start.</p>}
    </div>
  );
}
