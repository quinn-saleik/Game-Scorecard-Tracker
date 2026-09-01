import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { subscribeToPlayers } from "../../../data/players";
import { createSession } from "../../../data/gameSessions";
import OngoingGames from "../../../components/OngoingGames";
import PlayerDot from "../../../components/PlayerDot";
import GameInstructions from "../../../components/GameInstructions";

export default function GinRummySetup() {
  const [players, setPlayers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [targetScore, setTargetScore] = useState(100);
  const [starting, setStarting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => subscribeToPlayers((list) => setPlayers(list)), []);

  const active = players.filter((p) => p.active);

  function toggle(id) {
    setSelected((s) => {
      if (s.includes(id)) return s.filter((x) => x !== id);
      if (s.length >= 2) return s; // exactly 2 players for Gin Rummy
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
        gameType: "gin-rummy",
        gameLabel: "Gin Rummy",
        players: sessionPlayers,
        config: { targetScore: Number(targetScore) || 100 },
      });
      navigate(`/gin-rummy/play/${id}`);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">
        <span className="suit red">♥</span> Gin Rummy — Who's playing?
      </h1>
      <OngoingGames gameType="gin-rummy" />

      <GameInstructions players="Exactly 2 players">
        <p style={{ margin: "0 0 10px" }}>
          <strong>Objective:</strong> Be the first to reach the target score across a series of
          hands.
        </p>
        <p style={{ margin: "0 0 10px" }}>
          <strong>How to play:</strong> Deal 10 cards each. Draw and discard each turn, building
          sets and runs; knock once your unmatched cards ("deadwood") total 10 or less, or go
          gin with no deadwood at all for a bonus.
        </p>
        <p style={{ margin: 0 }}>
          <strong>Scoring:</strong> Play the hand for real, then come back here. After each
          hand, enter who won and their hand score (the deadwood difference, already including
          any gin or undercut bonus you've worked out yourselves) — the app automatically adds
          the standard +20 bonus on top for winning the hand. First player to reach the target
          score wins the game.
        </p>
      </GameInstructions>

      <div className="card-surface">
        <h2>Select 2 players ({seated.length}/2)</h2>
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
        <h2>Target score</h2>
        <div className="field">
          <label htmlFor="targetScore">Points to win</label>
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

      <button className="btn primary" disabled={seated.length !== 2 || starting} onClick={handleStart}>
        {starting ? "Starting…" : "Start game"}
      </button>
      {seated.length !== 2 && <p className="empty-state">Pick exactly 2 players to start.</p>}
    </div>
  );
}
