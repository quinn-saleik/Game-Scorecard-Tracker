import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { subscribeToPlayers } from "../../../data/players";
import { createSession } from "../../../data/gameSessions";
import OngoingGames from "../../../components/OngoingGames";
import PlayerDot from "../../../components/PlayerDot";
import GameInstructions from "../../../components/GameInstructions";

export default function RoyalRumSetup() {
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
    if (seated.length < 2) return;
    setStarting(true);
    try {
      const sessionPlayers = seated.map((p) => ({ id: p.id, name: p.name, color: p.color || null, avatar: p.avatar || null, photo: p.photo || null }));
      const id = await createSession({
        gameType: "royal-rum",
        gameLabel: "Royal Rum",
        players: sessionPlayers,
        config: {},
      });
      navigate(`/royal-rum/play/${id}`);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">
        <span className="suit black">♦</span> Royal Rum — Who's playing?
      </h1>
      <OngoingGames gameType="royal-rum" />

      <GameInstructions players="2+ players">
        <p style={{ margin: "0 0 10px" }}>
          <strong>Objective:</strong> Be first to check off all 7 goals (melds numbered 6
          through 12), then have the lowest leftover points among anyone who's done that.
        </p>
        <p style={{ margin: "0 0 10px" }}>
          <strong>How to play:</strong> Everyone works toward the same 7 goals, in whatever
          order they get dealt into — there's no fixed sequence for the table. Each hand,
          players try to complete that hand's goal by melding the runs or sets it calls for.
        </p>
        <p style={{ margin: 0 }}>
          <strong>Scoring:</strong> Mark whatever goal (if any) a player completes; every
          player also enters their leftover points for the hand, whether they completed a
          goal or not — completing a goal doesn't zero your points, it just checks it off.
          Not completing a goal usually means you're stuck with a lot more points. First to
          check off all 7 ends the game; lowest score among anyone who's done that wins.
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
                {p.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <button className="btn primary" disabled={seated.length < 2 || starting} onClick={handleStart}>
        {starting ? "Starting…" : "Start game"}
      </button>
      {seated.length < 2 && <p className="empty-state">Pick at least 2 players to start.</p>}
    </div>
  );
}
