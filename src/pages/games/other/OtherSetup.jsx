import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { subscribeToPlayers } from "../../../data/players";
import { createSession } from "../../../data/gameSessions";
import OngoingGames from "../../../components/OngoingGames";
import PlayerDot from "../../../components/PlayerDot";

export default function OtherSetup() {
  const [players, setPlayers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [gameName, setGameName] = useState("");
  const [starting, setStarting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => subscribeToPlayers((list) => setPlayers(list)), []);

  const active = players.filter((p) => p.active);

  function toggle(id) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  const ready = gameName.trim().length > 0 && selected.length >= 2;

  async function handleStart() {
    if (!ready) return;
    setStarting(true);
    try {
      const sessionPlayers = active
        .filter((p) => selected.includes(p.id))
        .map((p) => ({ id: p.id, name: p.name, color: p.color || null, avatar: p.avatar || null, photo: p.photo || null }));
      const id = await createSession({
        gameType: "other",
        gameLabel: gameName.trim(),
        players: sessionPlayers,
        config: { customName: gameName.trim() },
      });
      navigate(`/other/play/${id}`);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">
        <span className="suit black">🃏</span> Other — Set up
      </h1>
      <OngoingGames gameType="other" />

      <div className="card-surface">
        <h2>Game name</h2>
        <div className="field">
          <label htmlFor="gameName">What are you playing?</label>
          <input
            id="gameName"
            className="input"
            placeholder="e.g. Poker, Yahtzee, Rummy…"
            value={gameName}
            onChange={(e) => setGameName(e.target.value)}
          />
        </div>
        <p style={{ color: "var(--muted)", fontSize: 13 }}>
          Games with the same name (any capitalization) are grouped together in Stats.
        </p>
      </div>

      <div className="card-surface">
        <h2>Select players ({selected.length} selected)</h2>
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

      <p style={{ color: "var(--muted)", fontSize: 14 }}>
        No win threshold here — add scores round by round, then hit "Finish game" whenever you're done and pick the winner(s) yourself.
      </p>

      <button className="btn primary" disabled={!ready || starting} onClick={handleStart}>
        {starting ? "Starting…" : "Start game"}
      </button>
      {!ready && (
        <p className="empty-state">
          {gameName.trim() ? "Pick at least 2 players to start." : "Name the game and pick at least 2 players to start."}
        </p>
      )}
    </div>
  );
}
