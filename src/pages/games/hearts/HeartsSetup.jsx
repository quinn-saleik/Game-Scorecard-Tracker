import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { subscribeToPlayers } from "../../../data/players";
import { createSession } from "../../../data/gameSessions";
import OngoingGames from "../../../components/OngoingGames";
import PlayerDot from "../../../components/PlayerDot";

export default function HeartsSetup() {
  const [players, setPlayers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [targetScore, setTargetScore] = useState(100);
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
    if (selected.length < 3 || selected.length > 6) return;
    setStarting(true);
    try {
      const sessionPlayers = active
        .filter((p) => selected.includes(p.id))
        .map((p) => ({ id: p.id, name: p.name, color: p.color || null, avatar: p.avatar || null, photo: p.photo || null }));
      const id = await createSession({
        gameType: "hearts",
        gameLabel: "Hearts",
        players: sessionPlayers,
        config: { targetScore: Number(targetScore) || 100 },
      });
      navigate(`/hearts/play/${id}`);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">
        <span className="suit red">♥</span> Hearts — Who's playing?
      </h1>
      <OngoingGames gameType="hearts" />

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
        <h2>Target score</h2>
        <div className="field">
          <label htmlFor="targetScore">Game ends once someone reaches</label>
          <input
            id="targetScore"
            className="input"
            type="number"
            min="1"
            value={targetScore}
            onChange={(e) => setTargetScore(e.target.value)}
          />
        </div>
      </div>

      <div className="card-surface">
        <h2>How it works</h2>
        <p style={{ color: "var(--muted)", fontSize: 14 }}>
          Every heart taken is worth 1 point and the queen of spades is worth 13 — lowest score
          wins. After each hand, enter what everyone took. Once a player reaches (or passes) the
          target score, the hand is over and whoever has the lowest total overall wins the game.
          If a player "shoots the moon" (takes every heart and the queen), they score 0 for the
          hand while everyone else takes 26 — use the shortcut button below each hand to fill
          that in fast.
        </p>
      </div>

      <button
        className="btn primary"
        disabled={selected.length < 3 || selected.length > 6 || starting}
        onClick={handleStart}
      >
        {starting ? "Starting…" : "Start game"}
      </button>
      {(selected.length < 3 || selected.length > 6) && (
        <p className="empty-state">Pick 3 to 6 players to start.</p>
      )}
    </div>
  );
}
