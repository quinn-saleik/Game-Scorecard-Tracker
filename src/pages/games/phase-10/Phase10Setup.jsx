import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { subscribeToPlayers } from "../../../data/players";
import { createSession } from "../../../data/gameSessions";
import OngoingGames from "../../../components/OngoingGames";
import PlayerDot from "../../../components/PlayerDot";
import { shortName } from "../../../data/playerNames";
import GameInstructions from "../../../components/GameInstructions";

export default function Phase10Setup() {
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
        gameType: "phase-10",
        gameLabel: "Phase 10",
        players: sessionPlayers,
        config: {},
      });
      navigate(`/phase-10/play/${id}`);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">
        <span className="suit black">🔟</span> Phase 10 — Who's playing?
      </h1>
      <OngoingGames gameType="phase-10" />

      <GameInstructions players="2+ players">
        <p style={{ margin: "0 0 10px" }}>
          <strong>Objective:</strong> Be the first to complete all 10 phases (runs, sets, and
          color groups that get trickier as you go). If more than one player finishes phase 10 in
          the same hand, lowest total points wins.
        </p>
        <p style={{ margin: "0 0 10px" }}>
          <strong>How to play:</strong> Everyone works on their own current phase, in order —
          you can't attempt phase 2 until you've completed phase 1, and so on. Each hand, try to
          lay down your current phase using the cards you draw and discard; once it's down you can
          also play extra cards onto it and onto phases other players have already laid down.
          Whatever's left in your hand at the end of the hand counts against you.
        </p>
        <p style={{ margin: 0 }}>
          <strong>Scoring:</strong> After each hand, mark whether a player completed their current
          phase (advancing them to the next one), and enter everyone's leftover points for the
          hand. First to complete phase 10 ends the game; lowest total points among anyone who's
          done that wins.
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

      <button className="btn primary" disabled={seated.length < 2 || starting} onClick={handleStart}>
        {starting ? "Starting…" : "Start game"}
      </button>
      {seated.length < 2 && <p className="empty-state">Pick at least 2 players to start.</p>}
    </div>
  );
}
