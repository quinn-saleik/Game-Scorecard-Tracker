import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { subscribeToPlayers } from "../../../data/players";
import { createSession } from "../../../data/gameSessions";
import OngoingGames from "../../../components/OngoingGames";
import PlayerDot from "../../../components/PlayerDot";

export default function PartnerSetup() {
  const [players, setPlayers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [threshold, setThreshold] = useState(10);
  const [starting, setStarting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => subscribeToPlayers((list) => setPlayers(list)), []);

  const active = players.filter((p) => p.active);

  function toggle(id) {
    setSelected((s) => {
      if (s.includes(id)) return s.filter((x) => x !== id);
      if (s.length >= 4) return s;
      return [...s, id];
    });
  }

  const seated = selected.map((id) => active.find((p) => p.id === id)).filter(Boolean);

  async function handleStart() {
    if (seated.length !== 4) return;
    setStarting(true);
    try {
      const sessionPlayers = seated.map((p) => ({ id: p.id, name: p.name, color: p.color || null, avatar: p.avatar || null, photo: p.photo || null }));
      const id = await createSession({
        gameType: "euchre-partner",
        gameLabel: "Euchre (pick your partner)",
        players: sessionPlayers,
        config: { winThreshold: Number(threshold) || 10 },
      });
      navigate(`/euchre/partner/play/${id}`);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">
        <span className="suit black">🤝</span> Euchre (pick your partner) — Who's playing?
      </h1>
      <OngoingGames gameType="euchre-partner" />

      <div className="card-surface">
        <h2>Select 4 players ({seated.length}/4)</h2>
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
        <p style={{ color: "var(--muted)", fontSize: 14 }}>
          Partners are called during play, not fixed at setup. Each hand: mark who's on the
          bid team (1 player going alone, or 2), enter their points, then enter the points
          everyone else gets. Scores are tracked per player. First to reach the target wins.
        </p>
      </div>

      <button className="btn primary" disabled={seated.length !== 4 || starting} onClick={handleStart}>
        {starting ? "Starting…" : "Start game"}
      </button>
      {seated.length !== 4 && <p className="empty-state">Pick exactly 4 players to start.</p>}
    </div>
  );
}
