import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { subscribeToPlayers } from "../../../data/players";
import { createSession } from "../../../data/gameSessions";
import OngoingGames from "../../../components/OngoingGames";
import PlayerDot from "../../../components/PlayerDot";
import GameInstructions from "../../../components/GameInstructions";

const HOLE_OPTIONS = [6, 9, 18];

export default function GolfSetup() {
  const [players, setPlayers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [holes, setHoles] = useState(9);
  const [starting, setStarting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => subscribeToPlayers((list) => setPlayers(list)), []);

  const active = players.filter((p) => p.active);

  function toggle(id) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  const seated = selected.map((id) => active.find((p) => p.id === id)).filter(Boolean);

  async function handleStart() {
    if (seated.length < 2 || seated.length > 6) return;
    setStarting(true);
    try {
      const sessionPlayers = seated.map((p) => ({ id: p.id, name: p.name, color: p.color || null, avatar: p.avatar || null, photo: p.photo || null }));
      const id = await createSession({
        gameType: "golf",
        gameLabel: "Golf",
        players: sessionPlayers,
        config: { holes },
      });
      navigate(`/golf/play/${id}`);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">
        <span className="suit black">⛳</span> Golf — Who's playing?
      </h1>
      <OngoingGames gameType="golf" />

      <GameInstructions players="2-6 players">
        <p style={{ margin: "0 0 10px" }}>
          <strong>Objective:</strong> Lowest total score after all the holes wins.
        </p>
        <p style={{ margin: "0 0 10px" }}>
          <strong>How to play:</strong> Each player gets a grid of face-down cards (commonly 2
          rows of 3) and peeks at 2 of them to start. On your turn, draw a card and either swap
          it into your grid — discarding what was there — or discard it, trying to lower your
          total and complete matching rows or columns.
        </p>
        <p style={{ margin: 0 }}>
          <strong>Scoring:</strong> Each hole, enter your score for that deal — aces are 1,
          twos are -2, 3 through 10 are face value, jacks and queens are 10, kings are 0, and
          matching pairs or columns can cancel to zero. Lowest total after all the holes wins.
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

      <div className="card-surface">
        <h2>Holes</h2>
        <div className="chip-row">
          {HOLE_OPTIONS.map((n) => (
            <span
              key={n}
              className={`player-chip ${holes === n ? "selected" : ""}`}
              onClick={() => setHoles(n)}
            >
              {n} holes
            </span>
          ))}
        </div>
      </div>

      <button className="btn primary" disabled={seated.length < 2 || seated.length > 6 || starting} onClick={handleStart}>
        {starting ? "Starting…" : "Start game"}
      </button>
      {seated.length < 2 && <p className="empty-state">Pick at least 2 players to start.</p>}
      {seated.length > 6 && <p className="empty-state">Golf supports up to 6 players.</p>}
    </div>
  );
}
