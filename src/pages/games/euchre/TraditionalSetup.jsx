import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { subscribeToPlayers } from "../../../data/players";
import { createSession } from "../../../data/gameSessions";
import { shuffleArray } from "../../../data/shuffle";
import OngoingGames from "../../../components/OngoingGames";
import PlayerDot from "../../../components/PlayerDot";
import GameInstructions from "../../../components/GameInstructions";

export default function TraditionalSetup() {
  const [players, setPlayers] = useState([]);
  const [teamA, setTeamA] = useState([]);
  const [teamB, setTeamB] = useState([]);
  const [threshold, setThreshold] = useState(10);
  const [starting, setStarting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => subscribeToPlayers((list) => setPlayers(list)), []);

  const active = players.filter((p) => p.active);

  function toggle(id) {
    if (teamA.includes(id)) return setTeamA((s) => s.filter((x) => x !== id));
    if (teamB.includes(id)) return setTeamB((s) => s.filter((x) => x !== id));
    if (teamA.length <= teamB.length && teamA.length < 2) return setTeamA((s) => [...s, id]);
    if (teamB.length < 2) return setTeamB((s) => [...s, id]);
  }

  // Re-randomize which 2 players end up on which team. Works off whoever's
  // already tapped in if that's already 4; otherwise tops up from the rest
  // of the active roster first, so one tap can build the whole matchup.
  function shuffleTeams() {
    const assigned = [...teamA, ...teamB];
    const rest = active.map((p) => p.id).filter((id) => !assigned.includes(id));
    const pool =
      assigned.length >= 4
        ? assigned.slice(0, 4)
        : [...assigned, ...shuffleArray(rest)].slice(0, 4);
    const shuffled = shuffleArray(pool);
    setTeamA(shuffled.slice(0, 2));
    setTeamB(shuffled.slice(2, 4));
  }

  const teamAPlayers = teamA.map((id) => active.find((p) => p.id === id)).filter(Boolean);
  const teamBPlayers = teamB.map((id) => active.find((p) => p.id === id)).filter(Boolean);
  const ready = teamAPlayers.length === 2 && teamBPlayers.length === 2;

  async function handleStart() {
    if (!ready) return;
    setStarting(true);
    try {
      const aPlayers = teamAPlayers.map((p) => ({ id: p.id, name: p.name, color: p.color || null, avatar: p.avatar || null, photo: p.photo || null }));
      const bPlayers = teamBPlayers.map((p) => ({ id: p.id, name: p.name, color: p.color || null, avatar: p.avatar || null, photo: p.photo || null }));
      const id = await createSession({
        gameType: "euchre-traditional",
        gameLabel: "Euchre (traditional)",
        players: [...aPlayers, ...bPlayers],
        config: {
          winThreshold: Number(threshold) || 10,
          teamA: aPlayers.map((p) => p.id),
          teamB: bPlayers.map((p) => p.id),
        },
      });
      navigate(`/euchre/traditional/play/${id}`);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">
        <span className="suit black">♣</span> Euchre (traditional) — Teams
      </h1>
      <OngoingGames gameType="euchre-traditional" />

      <GameInstructions players="Exactly 4 players (2 teams of 2)">
        <p style={{ margin: "0 0 10px" }}>
          <strong>Objective:</strong> Standard partnership euchre, 2 versus 2.
        </p>
        <p style={{ margin: "0 0 10px" }}>
          <strong>How to play:</strong> Deal from a 24-card euchre deck (9 through Ace). Turn up
          a card to propose trump — each player in turn orders it up or passes; a second round
          lets anyone call a different suit. The jack of trump ("right bower") outranks
          everything, followed by the same-color jack ("left bower"). The calling side needs at
          least 3 of 5 tricks to score.
        </p>
        <p style={{ margin: 0 }}>
          <strong>Scoring:</strong> Typical scoring: 1 point for 3-4 tricks, 2 for a march (all
          5), 4 for winning alone and taking all 5, and 2 to the defending team if the callers
          are euchred (fail to take 3). Enter each team's points after the hand — use your own
          house scoring if it differs. First team to the target score wins.
        </p>
      </GameInstructions>

      <div className="card-surface">
        <div className="btn-row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <h2>Tap players to assign teams</h2>
          <button type="button" className="btn small" onClick={shuffleTeams} disabled={active.length < 4}>
            🎲 Shuffle teams
          </button>
        </div>
        <p style={{ color: "var(--muted)", fontSize: 14, marginTop: -6 }}>
          First 2 taps go to Team 1, next 2 to Team 2 — or let Shuffle pick for you.
        </p>
        {active.length === 0 ? (
          <p className="empty-state">No active players. Add some on the Players tab first.</p>
        ) : (
          <div className="chip-row">
            {active.map((p) => {
              const onA = teamA.includes(p.id);
              const onB = teamB.includes(p.id);
              return (
                <span
                  key={p.id}
                  className={`player-chip ${onA || onB ? "selected" : ""}`}
                  onClick={() => toggle(p.id)}
                >
                  {onA ? "① " : onB ? "② " : ""}
                  <PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />
                  {p.name}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div className="card-surface">
        <h2>Team 1</h2>
        <p>
          {teamAPlayers.length
            ? teamAPlayers.map((p, i) => (
                <span key={p.id}>
                  {i > 0 && " & "}
                  <PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />{p.name}
                </span>
              ))
            : "—"}
        </p>
        <h2>Team 2</h2>
        <p>
          {teamBPlayers.length
            ? teamBPlayers.map((p, i) => (
                <span key={p.id}>
                  {i > 0 && " & "}
                  <PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />{p.name}
                </span>
              ))
            : "—"}
        </p>
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

      <button className="btn primary" disabled={!ready || starting} onClick={handleStart}>
        {starting ? "Starting…" : "Start game"}
      </button>
      {!ready && <p className="empty-state">Assign exactly 2 players to each team to start.</p>}
    </div>
  );
}
