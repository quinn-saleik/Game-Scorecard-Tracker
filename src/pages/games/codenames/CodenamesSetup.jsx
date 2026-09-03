import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { subscribeToPlayers } from "../../../data/players";
import { createSession } from "../../../data/gameSessions";
import { shuffleArray } from "../../../data/shuffle";
import OngoingGames from "../../../components/OngoingGames";
import PlayerDot from "../../../components/PlayerDot";
import { shortName } from "../../../data/playerNames";
import GameInstructions from "../../../components/GameInstructions";

export default function CodenamesSetup() {
  const [players, setPlayers] = useState([]);
  const [teamA, setTeamA] = useState([]);
  const [teamB, setTeamB] = useState([]);
  const [threshold, setThreshold] = useState(1);
  const [starting, setStarting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => subscribeToPlayers((list) => setPlayers(list)), []);

  const active = players.filter((p) => p.active);

  // Tap a player to cycle unassigned -> Team 1 -> Team 2 -> unassigned.
  function cycle(id) {
    if (teamA.includes(id)) {
      setTeamA((s) => s.filter((x) => x !== id));
      setTeamB((s) => [...s, id]);
      return;
    }
    if (teamB.includes(id)) {
      setTeamB((s) => s.filter((x) => x !== id));
      return;
    }
    setTeamA((s) => [...s, id]);
  }

  function shuffleTeams() {
    const assigned = [...teamA, ...teamB];
    const pool = shuffleArray(assigned.length >= 2 ? assigned : active.map((p) => p.id));
    const mid = Math.ceil(pool.length / 2);
    setTeamA(pool.slice(0, mid));
    setTeamB(pool.slice(mid));
  }

  const teamAPlayers = teamA.map((id) => active.find((p) => p.id === id)).filter(Boolean);
  const teamBPlayers = teamB.map((id) => active.find((p) => p.id === id)).filter(Boolean);
  const ready = teamAPlayers.length >= 1 && teamBPlayers.length >= 1;

  async function handleStart() {
    if (!ready) return;
    setStarting(true);
    try {
      const aPlayers = teamAPlayers.map((p) => ({ id: p.id, name: p.name, color: p.color || null, avatar: p.avatar || null, photo: p.photo || null }));
      const bPlayers = teamBPlayers.map((p) => ({ id: p.id, name: p.name, color: p.color || null, avatar: p.avatar || null, photo: p.photo || null }));
      const id = await createSession({
        gameType: "codenames",
        gameLabel: "Codenames",
        players: [...aPlayers, ...bPlayers],
        config: {
          winThreshold: Number(threshold) || 1,
          teamA: aPlayers.map((p) => p.id),
          teamB: bPlayers.map((p) => p.id),
        },
      });
      navigate(`/codenames/play/${id}`);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">
        <span className="suit black">🕵️</span> Codenames — Teams
      </h1>
      <OngoingGames gameType="codenames" />

      <GameInstructions players="4+ players (2 teams, any size)">
        <p style={{ margin: "0 0 10px" }}>
          <strong>Objective:</strong> Be the first team to correctly identify all your agents'
          codenames on the grid.
        </p>
        <p style={{ margin: "0 0 10px" }}>
          <strong>How to play:</strong> One player per team is the spymaster and gives a one-word
          clue plus a number, hinting at multiple words on the grid without saying them. The rest
          of the team guesses which words match. A correct guess lets you keep guessing (up to
          the clue's number, plus one); a bystander ends your turn; the other team's word helps
          them instead; and the assassin word ends the game on the spot for whoever guesses it.
        </p>
        <p style={{ margin: 0 }}>
          <strong>Scoring:</strong> Tap the team that finished their board first (or won because
          the other team hit the assassin) after each game. First to the target number of games
          wins the match — leave it at 1 for a single decisive board.
        </p>
      </GameInstructions>

      <div className="card-surface">
        <div className="btn-row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <h2>Tap players to assign teams</h2>
          <button type="button" className="btn small" onClick={shuffleTeams} disabled={active.length < 2}>
            🎲 Shuffle teams
          </button>
        </div>
        <p style={{ color: "var(--muted)", fontSize: 14, marginTop: -6 }}>
          Team sizes don't need to match. Tap a player to cycle Team 1 → Team 2 → unassigned, or let Shuffle split everyone up.
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
                  onClick={() => cycle(p.id)}
                >
                  {onA ? "① " : onB ? "② " : ""}
                  <PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />
                  {shortName(p)}
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
                  <PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />{shortName(p)}
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
                  <PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />{shortName(p)}
                </span>
              ))
            : "—"}
        </p>
      </div>

      <div className="card-surface">
        <h2>Match length</h2>
        <div className="field">
          <label htmlFor="threshold">Games to win the match</label>
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
      {!ready && <p className="empty-state">Put at least 1 player on each team to start.</p>}
    </div>
  );
}
