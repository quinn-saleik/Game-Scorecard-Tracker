import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { subscribeToPlayers } from "../../../data/players";
import { createSession } from "../../../data/gameSessions";

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
      const sessionPlayers = seated.map((p) => ({ id: p.id, name: p.name }));
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

      <div className="card-surface">
        <h2>Select 2 players ({seated.length}/2)</h2>
        <p style={{ color: "#6f6455", fontSize: 14, marginTop: -6 }}>
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
