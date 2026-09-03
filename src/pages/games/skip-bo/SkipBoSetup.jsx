import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { subscribeToPlayers } from "../../../data/players";
import { createSession } from "../../../data/gameSessions";
import OngoingGames from "../../../components/OngoingGames";
import PlayerDot from "../../../components/PlayerDot";
import { shortName } from "../../../data/playerNames";
import GameInstructions from "../../../components/GameInstructions";

export default function SkipBoSetup() {
  const [players, setPlayers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [threshold, setThreshold] = useState(3);
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
        gameType: "skip-bo",
        gameLabel: "Skip-Bo",
        players: sessionPlayers,
        config: { winThreshold: Number(threshold) || 3 },
      });
      navigate(`/skip-bo/play/${id}`);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">
        <span className="suit red">🔢</span> Skip-Bo — Who's playing?
      </h1>
      <OngoingGames gameType="skip-bo" />

      <GameInstructions players="2+ players">
        <p style={{ margin: "0 0 10px" }}>
          <strong>Objective:</strong> Be the first to play every card from your 30-card stockpile.
        </p>
        <p style={{ margin: "0 0 10px" }}>
          <strong>How to play:</strong> Everyone starts with a face-down stockpile and a hand of
          five cards. On your turn, build up shared center piles in sequence from 1 to 12 (Skip-Bo
          cards are wild), playing from your stockpile, your hand, or up to four discard piles of
          your own. Refill your hand from the draw pile once it's empty, and end your turn by
          discarding if you're out of moves. The center piles reset to empty once they hit 12.
        </p>
        <p style={{ margin: 0 }}>
          <strong>Scoring:</strong> Tap whoever empties their stockpile first when a hand wraps
          up. First to the target number of hand-wins takes the match — leave it at 1 for a
          single decisive hand.
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
        <h2>Match length</h2>
        <div className="field">
          <label htmlFor="threshold">Hand-wins to take the match</label>
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
