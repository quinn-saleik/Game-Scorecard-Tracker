import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { subscribeToPlayers } from "../../../data/players";
import { createSession } from "../../../data/gameSessions";
import OngoingGames from "../../../components/OngoingGames";
import PlayerDot from "../../../components/PlayerDot";
import { shortName } from "../../../data/playerNames";
import GameInstructions from "../../../components/GameInstructions";

const MIN_PLAYERS = 3;

export default function PartnerSetup() {
  const [players, setPlayers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [threshold, setThreshold] = useState(10);
  const [starting, setStarting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => subscribeToPlayers((list) => setPlayers(list)), []);

  const active = players.filter((p) => p.active);

  // No fixed player count — any table of 3 or more can play, since the
  // bidder either calls one partner or goes it alone and everyone else just
  // shares the "everyone else" score each hand.
  function toggle(id) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  const seated = selected.map((id) => active.find((p) => p.id === id)).filter(Boolean);

  async function handleStart() {
    if (seated.length < MIN_PLAYERS) return;
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

      <GameInstructions players="3 or more players">
        <p style={{ margin: "0 0 10px" }}>
          <strong>Objective:</strong> Standard trump-calling euchre, but partners are chosen
          hand by hand instead of fixed teams.
        </p>
        <p style={{ margin: "0 0 10px" }}>
          <strong>How to play:</strong> Deal and call trump using your usual euchre rules.
          Whoever bids the most names trump. They can go alone, or call a partner (often "best
          card" or a named card) to play with them for that hand only — the rest of the table
          defends.
        </p>
        <p style={{ margin: 0 }}>
          <strong>Scoring:</strong> After the hand, enter who bid and how much, then how many
          tricks they actually took. Making the bid or better scores that many tricks; falling
          short scores negative their bid instead. Then say who their partner was (or that they
          went alone) — the partner gets that same score. Everyone else shares one "how many did
          everyone else get?" entry. First to the target wins.
        </p>
      </GameInstructions>

      <div className="card-surface">
        <h2>Select players ({seated.length} selected)</h2>
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

      <button className="btn primary" disabled={seated.length < MIN_PLAYERS || starting} onClick={handleStart}>
        {starting ? "Starting…" : "Start game"}
      </button>
      {seated.length < MIN_PLAYERS && <p className="empty-state">Pick at least {MIN_PLAYERS} players to start.</p>}
    </div>
  );
}
