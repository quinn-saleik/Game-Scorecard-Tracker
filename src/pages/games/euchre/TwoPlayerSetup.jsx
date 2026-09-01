import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { subscribeToPlayers } from "../../../data/players";
import { createSession } from "../../../data/gameSessions";
import OngoingGames from "../../../components/OngoingGames";
import PlayerDot from "../../../components/PlayerDot";
import GameInstructions from "../../../components/GameInstructions";

export default function TwoPlayerSetup() {
  const [players, setPlayers] = useState([]);
  const [selected, setSelected] = useState([]); // order = who deals first
  const [threshold, setThreshold] = useState(50);
  const [starting, setStarting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => subscribeToPlayers((list) => setPlayers(list)), []);

  const active = players.filter((p) => p.active);

  function toggle(id) {
    setSelected((s) => {
      if (s.includes(id)) return s.filter((x) => x !== id);
      if (s.length >= 2) return s; // exactly 2 players for this variant
      return [...s, id];
    });
  }

  const seated = selected.map((id) => active.find((p) => p.id === id)).filter(Boolean);

  async function handleStart() {
    if (seated.length !== 2) return;
    setStarting(true);
    try {
      const sessionPlayers = seated.map((p) => ({ id: p.id, name: p.name, color: p.color || null, avatar: p.avatar || null, photo: p.photo || null }));
      const id = await createSession({
        gameType: "euchre-2p",
        gameLabel: "Euchre (2-player)",
        players: sessionPlayers,
        config: { winThreshold: Number(threshold) || 50 },
      });
      navigate(`/euchre/2p/play/${id}`);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">
        <span className="suit black">♣</span> Euchre (2-player) — Who's playing?
      </h1>
      <OngoingGames gameType="euchre-2p" />

      <GameInstructions players="Exactly 2 players">
        <p style={{ margin: "0 0 10px" }}>
          <strong>Objective:</strong> Standard euchre trump-calling and trick-play, head-to-head.
        </p>
        <p style={{ margin: "0 0 10px" }}>
          <strong>How to play:</strong> Deal from a 24-card euchre deck (9 through Ace in each
          suit). Turn up a card to propose trump — each player can order it up (accept it) or
          pass; if both pass, a second round lets either player name a different suit. The jack
          of the trump suit ("right bower") is the top card, and the same-color jack ("left
          bower") is the second-highest trump. Play out the tricks with whichever two-handed
          variant you use at your table (many deal a smaller hand or add a dummy hand).
        </p>
        <p style={{ margin: 0 }}>
          <strong>Scoring:</strong> Enter each player's points for the hand — commonly 1 point
          for taking the majority of tricks, 2 for a march (all of them). First to the target
          score wins.
        </p>
      </GameInstructions>

      <div className="card-surface">
        <h2>Select 2 players ({seated.length}/2)</h2>
        <p style={{ color: "var(--muted)", fontSize: 14, marginTop: -6 }}>
          Tap in order — the first player picked deals first.
        </p>
        {active.length === 0 ? (
          <p className="empty-state">No active players. Add some on the Players tab first.</p>
        ) : (
          <div className="chip-row">
            {active.map((p) => {
              const seatNum = selected.indexOf(p.id);
              return (
                <span
                  key={p.id}
                  className={`player-chip ${seatNum > -1 ? "selected" : ""}`}
                  onClick={() => toggle(p.id)}
                >
                  {seatNum > -1 ? `${seatNum + 1}. ` : ""}
                  <PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />
                  {p.name}
                </span>
              );
            })}
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

      <button className="btn primary" disabled={seated.length !== 2 || starting} onClick={handleStart}>
        {starting ? "Starting…" : "Start game"}
      </button>
      {seated.length !== 2 && <p className="empty-state">Pick exactly 2 players to start.</p>}
    </div>
  );
}
