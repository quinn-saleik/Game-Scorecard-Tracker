import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { subscribeToPlayers } from "../../../data/players";
import { createSession } from "../../../data/gameSessions";
import OngoingGames from "../../../components/OngoingGames";
import PlayerDot from "../../../components/PlayerDot";
import { shortName } from "../../../data/playerNames";
import GameInstructions from "../../../components/GameInstructions";

export default function EgyptianRatscrewSetup() {
  const [players, setPlayers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [threshold, setThreshold] = useState(5);
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
        gameType: "egyptian-ratscrew",
        gameLabel: "Egyptian Ratscrew",
        players: sessionPlayers,
        config: { winThreshold: Number(threshold) || 5 },
      });
      navigate(`/egyptian-ratscrew/play/${id}`);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">
        <span className="suit red">✋</span> Egyptian Ratscrew — Who's playing?
      </h1>
      <OngoingGames gameType="egyptian-ratscrew" />

      <GameInstructions players="2+ players">
        <p style={{ margin: "0 0 10px" }}>
          <strong>Objective:</strong> Be the first to collect every card in the deck.
        </p>
        <p style={{ margin: "0 0 10px" }}>
          <strong>How to play:</strong> Deal the whole deck out evenly, no peeking. Players take
          turns flipping their top card face-up into a shared center pile. When a face card (Jack,
          Queen, King, or Ace) comes up, the next player must play "challenge" cards trying to
          beat it — miss the challenge and the face-card player takes the whole pile. Any time a
          double, a sandwich, or your table's other called-out patterns appear on top, everyone
          can slap the pile — fastest hand takes it all. Run out of cards and you're out, unless
          you slap your way back in.
        </p>
        <p style={{ margin: 0 }}>
          <strong>Scoring:</strong> Tap whoever ends up holding the entire deck when a hand wraps
          up. First to the target number of hand-wins takes the match.
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
