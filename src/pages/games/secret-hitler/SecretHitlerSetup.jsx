import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { subscribeToPlayers } from "../../../data/players";
import { createSession } from "../../../data/gameSessions";
import OngoingGames from "../../../components/OngoingGames";
import PlayerDot from "../../../components/PlayerDot";
import { shortName } from "../../../data/playerNames";
import GameInstructions from "../../../components/GameInstructions";

export default function SecretHitlerSetup() {
  const [players, setPlayers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [starting, setStarting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => subscribeToPlayers((list) => setPlayers(list)), []);

  const active = players.filter((p) => p.active);

  function toggle(id) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  const seated = selected.map((id) => active.find((p) => p.id === id)).filter(Boolean);

  async function handleStart() {
    if (seated.length < 5) return;
    setStarting(true);
    try {
      const sessionPlayers = seated.map((p) => ({ id: p.id, name: p.name, color: p.color || null, avatar: p.avatar || null, photo: p.photo || null }));
      const id = await createSession({
        gameType: "secret-hitler",
        gameLabel: "Secret Hitler",
        players: sessionPlayers,
        config: {},
      });
      navigate(`/secret-hitler/play/${id}`);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">
        <span className="suit black">🎭</span> Secret Hitler — Who's playing?
      </h1>
      <OngoingGames gameType="secret-hitler" />

      <GameInstructions players="5-10 players">
        <p style={{ margin: "0 0 10px" }}>
          <strong>Objective:</strong> Liberals win by passing enough Liberal policies, or by
          assassinating the secret Hitler. Fascists win by passing enough Fascist policies, or
          by getting Hitler elected Chancellor after 3 Fascist policies are already enacted.
        </p>
        <p style={{ margin: "0 0 10px" }}>
          <strong>How to play:</strong> Roles (Liberal, Fascist, and one secret Hitler) are dealt
          out privately at the start. Each round the table elects a President and Chancellor, who
          enact a policy card together — Fascists try to steer policy (and votes) their way while
          staying hidden, and Liberals try to root them out through discussion and voting.
        </p>
        <p style={{ margin: 0 }}>
          <strong>Scoring:</strong> This app doesn't track policy boards or votes — just play the
          game as normal. When it ends, come back here, tap everyone who was on the winning side,
          and finish.
        </p>
      </GameInstructions>

      <div className="card-surface">
        <h2>Select players ({seated.length})</h2>
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

      <button className="btn primary" disabled={seated.length < 5 || starting} onClick={handleStart}>
        {starting ? "Starting…" : "Start game"}
      </button>
      {seated.length < 5 && <p className="empty-state">Pick at least 5 players to start.</p>}
    </div>
  );
}
