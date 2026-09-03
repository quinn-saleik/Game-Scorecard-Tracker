import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { subscribeToPlayers } from "../../../data/players";
import { createSession } from "../../../data/gameSessions";
import OngoingGames from "../../../components/OngoingGames";
import PlayerDot from "../../../components/PlayerDot";
import { shortName } from "../../../data/playerNames";
import GameInstructions from "../../../components/GameInstructions";

export default function ThreePlayerSetup() {
  const [players, setPlayers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [startingScore, setStartingScore] = useState(15);
  const [starting, setStarting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => subscribeToPlayers((list) => setPlayers(list)), []);

  const active = players.filter((p) => p.active);

  function toggle(id) {
    setSelected((s) => {
      if (s.includes(id)) return s.filter((x) => x !== id);
      if (s.length >= 3) return s;
      return [...s, id];
    });
  }

  const seated = selected.map((id) => active.find((p) => p.id === id)).filter(Boolean);

  async function handleStart() {
    if (seated.length !== 3) return;
    setStarting(true);
    try {
      const sessionPlayers = seated.map((p) => ({ id: p.id, name: p.name, color: p.color || null, avatar: p.avatar || null, photo: p.photo || null }));
      const start = Number(startingScore) || 15;
      const id = await createSession({
        gameType: "euchre-3p",
        gameLabel: "Euchre (3-player)",
        players: sessionPlayers,
        config: { startingScore: start },
        initialTotals: Object.fromEntries(sessionPlayers.map((p) => [p.id, start])),
      });
      navigate(`/euchre/3p/play/${id}`);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">
        <span className="suit black">♣</span> Euchre (3-player) — Who's playing?
      </h1>
      <OngoingGames gameType="euchre-3p" />

      <GameInstructions players="Exactly 3 players">
        <p style={{ margin: "0 0 10px" }}>
          <strong>Objective:</strong> Cutthroat 3-handed euchre, played downward toward zero
          instead of up.
        </p>
        <p style={{ margin: "0 0 10px" }}>
          <strong>How to play:</strong> Standard trump-calling and trick-play rules — deal 5
          cards each, turn up a card, and players in turn order it up or call a different trump
          suit. Whoever calls trump (the "maker") plays alone against the other two for that
          hand.
        </p>
        <p style={{ margin: 0 }}>
          <strong>Scoring:</strong> Everyone starts at the same score and counts down. The maker
          loses 1 to 5 points depending on tricks taken (fewer tricks costs more), or if they're
          "set" — fail to take at least 3 tricks — they gain 5 points instead, moving further
          from zero. Enter each player's result after the hand. First to 0 or below wins.
        </p>
      </GameInstructions>

      <div className="card-surface">
        <h2>Select 3 players ({seated.length}/3)</h2>
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
        <h2>Starting score</h2>
        <div className="field">
          <label htmlFor="startingScore">Everyone starts at</label>
          <input
            id="startingScore"
            className="input"
            type="number"
            min="1"
            value={startingScore}
            onChange={(e) => setStartingScore(e.target.value)}
          />
        </div>
      </div>

      <button className="btn primary" disabled={seated.length !== 3 || starting} onClick={handleStart}>
        {starting ? "Starting…" : "Start game"}
      </button>
      {seated.length !== 3 && <p className="empty-state">Pick exactly 3 players to start.</p>}
    </div>
  );
}
