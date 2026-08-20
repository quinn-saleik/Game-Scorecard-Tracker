import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { subscribeToPlayers } from "../../../data/players";
import { createSession } from "../../../data/gameSessions";
import OngoingGames from "../../../components/OngoingGames";
import PlayerDot from "../../../components/PlayerDot";

export default function RoyalRumSetup() {
  const [players, setPlayers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [mode, setMode] = useState("fixed");
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
        config: { mode },
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
        <h2>Goal order</h2>
        <div className="chip-row">
          <span className={`player-chip ${mode === "fixed" ? "selected" : ""}`} onClick={() => setMode("fixed")}>
            Fixed — same goal for the table each hand
          </span>
          <span className={`player-chip ${mode === "free" ? "selected" : ""}`} onClick={() => setMode("free")}>
            Free — everyone picks their own
          </span>
        </div>
        <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 10 }}>
          Everyone's checking off 6 through 12. In fixed mode the app shows a reminder of which
          number the table's aiming for each hand (cycling 6→12, then back to 6 for anyone who
          missed one). Either way, mark whatever goal a player actually completes that hand — no
          hand's target is locked in stone if someone gets something else. Miss a goal and you
          enter your leftover points instead. First to check off all 7 ends the game; lowest
          score among anyone who's done that wins.
        </p>
      </div>

      <button className="btn primary" disabled={seated.length < 2 || starting} onClick={handleStart}>
        {starting ? "Starting…" : "Start game"}
      </button>
      {seated.length < 2 && <p className="empty-state">Pick at least 2 players to start.</p>}
    </div>
  );
}
