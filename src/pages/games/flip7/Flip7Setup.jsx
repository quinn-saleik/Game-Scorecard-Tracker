import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { subscribeToPlayers } from "../../../data/players";
import { createSession } from "../../../data/gameSessions";
import OngoingGames from "../../../components/OngoingGames";
import PlayerDot from "../../../components/PlayerDot";
import { shortName } from "../../../data/playerNames";
import GameInstructions from "../../../components/GameInstructions";

export default function Flip7Setup() {
  const [players, setPlayers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [threshold, setThreshold] = useState(200);
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
        gameType: "flip7",
        gameLabel: "Flip7",
        players: sessionPlayers,
        config: { winThreshold: Number(threshold) || 200 },
      });
      navigate(`/flip7/play/${id}`);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">
        <span className="suit red">🔥</span> Flip7 — Who's playing?
      </h1>
      <OngoingGames gameType="flip7" />

      <GameInstructions players="2+ players">
        <p style={{ margin: "0 0 10px" }}>
          <strong>Objective:</strong> Score the most points by flipping unique number cards
          without busting.
        </p>
        <p style={{ margin: "0 0 10px" }}>
          <strong>How to play:</strong> On your turn, flip the top card of a shared deck into
          your own row. Number cards run 0-12 — flip one you already have this round and you
          bust, scoring zero for the round. Modifier cards (+2 through +10, or ×2) boost your
          total; action cards can force another player to draw three more cards or freeze them
          into staying immediately. After your first card, you can choose to stay and lock in
          your total instead of risking another flip. Collecting 7 unique number cards ends
          your turn with a bonus and ends the round for everyone else too.
        </p>
        <p style={{ margin: 0 }}>
          <strong>Scoring:</strong> Once everyone's busted or stayed, enter each player's round
          total here (0 if they busted). First to reach the target score after a completed
          round wins.
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
