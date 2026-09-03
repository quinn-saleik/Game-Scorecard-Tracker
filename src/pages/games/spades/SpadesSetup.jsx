import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { subscribeToPlayers } from "../../../data/players";
import { createSession } from "../../../data/gameSessions";
import { shuffleArray } from "../../../data/shuffle";
import OngoingGames from "../../../components/OngoingGames";
import PlayerDot from "../../../components/PlayerDot";
import { shortName } from "../../../data/playerNames";
import GameInstructions from "../../../components/GameInstructions";

export default function SpadesSetup() {
  const [players, setPlayers] = useState([]);
  const [teamA, setTeamA] = useState([]);
  const [teamB, setTeamB] = useState([]);
  const [targetScore, setTargetScore] = useState(500);
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
        gameType: "spades",
        gameLabel: "Spades",
        players: [...aPlayers, ...bPlayers],
        config: {
          targetScore: Number(targetScore) || 500,
          teamA: aPlayers.map((p) => p.id),
          teamB: bPlayers.map((p) => p.id),
        },
      });
      navigate(`/spades/play/${id}`);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">
        <span className="suit black">♠</span> Spades — Teams
      </h1>
      <OngoingGames gameType="spades" />

      <GameInstructions players="Exactly 4 players (2 teams of 2)">
        <p style={{ margin: "0 0 10px" }}>
          <strong>Objective:</strong> Bid how many tricks your partnership will take, then
          make it.
        </p>
        <p style={{ margin: "0 0 10px" }}>
          <strong>How to play:</strong> Standard 4-player partnership spades — deal 13 cards
          each, spades are always trump, and every player bids individually before play
          starts; a player can also bid Nil (zero tricks) for a bonus. Play the hand out trick
          by trick.
        </p>
        <p style={{ margin: 0 }}>
          <strong>Scoring:</strong> Both teams' bids combine to a team total (nil bids handled
          separately). A team that makes its combined bid scores 10 points per trick bid plus 1
          for every overtrick; a team that falls short goes negative by 10 times its bid
          instead. A player going Nil is worth +100 to their team if they take zero tricks, or
          −100 if they don't. Bag penalties (−100 every time a team's bags reach 10) aren't
          automatically tracked here — keep an eye on it yourselves if your house plays with
          that rule.
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
        <h2>Winning score</h2>
        <div className="field">
          <label htmlFor="targetScore">Points to win</label>
          <input
            id="targetScore"
            className="input"
            type="number"
            min="1"
            value={targetScore}
            onChange={(e) => setTargetScore(e.target.value)}
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
