import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { subscribeToPlayers } from "../../../data/players";
import { createSession } from "../../../data/gameSessions";
import OngoingGames from "../../../components/OngoingGames";
import PlayerDot from "../../../components/PlayerDot";
import GameInstructions from "../../../components/GameInstructions";

export default function CribbageSetup() {
  const [players, setPlayers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [threshold, setThreshold] = useState(121);
  const [starting, setStarting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => subscribeToPlayers((list) => setPlayers(list)), []);

  const active = players.filter((p) => p.active);

  function toggle(id) {
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id]
    );
  }

  async function handleStart() {
    if (selected.length < 2) return;
    setStarting(true);
    try {
      const sessionPlayers = active
        .filter((p) => selected.includes(p.id))
        .map((p) => ({ id: p.id, name: p.name, color: p.color || null, avatar: p.avatar || null, photo: p.photo || null }));
      const id = await createSession({
        gameType: "cribbage",
        gameLabel: "Cribbage",
        players: sessionPlayers,
        config: { targetScore: Number(threshold) || 121 },
      });
      navigate(`/cribbage/play/${id}`);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">
        <span className="suit red">📍</span> Cribbage — Who's playing?
      </h1>
      <OngoingGames gameType="cribbage" />

      <GameInstructions players="2+ players (traditionally 2-4)">
        <p style={{ margin: "0 0 10px" }}>
          <strong>Objective:</strong> First to the target score (traditionally 121, once
          around the board twice) wins.
        </p>
        <p style={{ margin: "0 0 10px" }}>
          <strong>How to play:</strong> Deal 6 cards each (adjust for more than 2 players),
          with everyone contributing to a shared "crib" that belongs to the dealer. Peg points
          during play as cards are laid down (15s, pairs, runs, and 31), then score each hand
          and the crib against the starter card.
        </p>
        <p style={{ margin: 0 }}>
          <strong>Scoring:</strong> Play your hands on your own cribbage board — pegging, hand,
          and crib points included. After each deal, enter each player's combined total for
          the deal. First to the target score wins.
        </p>
      </GameInstructions>

      <div className="card-surface">
        <h2>Select players ({selected.length} selected)</h2>
        {active.length === 0 ? (
          <p className="empty-state">
            No active players. Add some on the Players tab first.
          </p>
        ) : (
          <div className="chip-row">
            {active.map((p) => (
              <span
                key={p.id}
                className={`player-chip ${selected.includes(p.id) ? "selected" : ""}`}
                onClick={() => toggle(p.id)}
              >
                <PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />
                {p.name}
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

      <button
        className="btn primary"
        disabled={selected.length < 2 || starting}
        onClick={handleStart}
      >
        {starting ? "Starting…" : "Start game"}
      </button>
      {selected.length < 2 && (
        <p className="empty-state">Pick at least 2 players to start.</p>
      )}
    </div>
  );
}
