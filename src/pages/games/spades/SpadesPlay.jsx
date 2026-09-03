import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  subscribeToSession,
  updateSession,
  completeSession,
} from "../../../data/gameSessions";
import PlayerDot from "../../../components/PlayerDot";
import { shortName } from "../../../data/playerNames";
import RoundHistory from "../../../components/RoundHistory";
import TvMode from "../../../components/TvMode";
import { recomputeTotals } from "../../../data/rounds";

const DEAL_SIZE = 13;
const NIL_BONUS = 100;
const backBtnStyle = { color: "var(--text-on-surface)", border: "2px solid var(--wood)" };

function TeamNames({ players }) {
  return players.map((p, i) => (
    <span key={p.id}>
      {i > 0 && " & "}
      <PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />{shortName(p)}
    </span>
  ));
}

function NumberPicker({ max, onSelect }) {
  const options = Array.from({ length: max + 1 }, (_, i) => i);
  return (
    <div className="chip-row">
      {options.map((n) => (
        <button key={n} type="button" className="btn small" onClick={() => onSelect(n)}>
          {n}
        </button>
      ))}
    </div>
  );
}

// Base bid/tricks score for one team: make (or exceed) the bid and score
// 10 per trick bid plus 1 for every trick beyond it; fall short and go
// negative by 10 times the bid instead. Holds fine at bid 0 too.
function bidScore(bid, tricks) {
  return tricks >= bid ? bid * 10 + (tricks - bid) : -(bid * 10);
}

export default function SpadesPlay() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [phase, setPhase] = useState("bidA"); // bidA | bidB | tricks | nil | confirm
  const [bidA, setBidA] = useState(null);
  const [bidB, setBidB] = useState(null);
  const [tricksA, setTricksA] = useState(null);
  const [nilPlayers, setNilPlayers] = useState([]);
  const [nilResults, setNilResults] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeToSession(sessionId, setSession), [sessionId]);

  // Reset the in-progress hand whenever one gets saved (or undone).
  useEffect(() => {
    setPhase("bidA");
    setBidA(null);
    setBidB(null);
    setTricksA(null);
    setNilPlayers([]);
    setNilResults({});
  }, [session?.rounds?.length]);

  if (!session) return <p className="empty-state">Loading game…</p>;

  if (session.status === "completed") {
    const winners = session.players.filter((p) => session.winnerIds.includes(p.id));
    return (
      <div className="card-surface">
        <h2>Game already finished</h2>
        <p>Winning team: {winners.map((p) => shortName(p)).join(" & ")}</p>
        <button className="btn primary" onClick={() => navigate("/")}>Back to games</button>
      </div>
    );
  }

  const targetScore = session.config?.targetScore || 500;
  const teamAIds = session.config?.teamA || [];
  const teamBIds = session.config?.teamB || [];
  const totals = session.totals || {};
  const rounds = session.rounds || [];
  const teamAPlayers = session.players.filter((p) => teamAIds.includes(p.id));
  const teamBPlayers = session.players.filter((p) => teamBIds.includes(p.id));
  const teamATotal = totals[teamAIds[0]] || 0;
  const teamBTotal = totals[teamBIds[0]] || 0;
  const pendingFinish = teamATotal >= targetScore || teamBTotal >= targetScore;
  const aWins = teamATotal >= targetScore && teamATotal >= teamBTotal;
  const winningTeamPlayers = aWins ? teamAPlayers : teamBPlayers;
  const tvRows = [
    { key: "A", label: teamAPlayers.map((p) => p.name).join(" & "), score: teamATotal, isLeader: teamATotal >= teamBTotal && teamATotal > 0 },
    { key: "B", label: teamBPlayers.map((p) => p.name).join(" & "), score: teamBTotal, isLeader: teamBTotal >= teamATotal && teamBTotal > 0 },
  ].sort((a, b) => b.score - a.score);

  async function undoLastRound() {
    setSaving(true);
    try {
      const last = rounds[rounds.length - 1];
      const newTotals = { ...totals };
      for (const id of teamAIds) newTotals[id] = (newTotals[id] || 0) - (last.teamAPoints || 0);
      for (const id of teamBIds) newTotals[id] = (newTotals[id] || 0) - (last.teamBPoints || 0);
      await updateSession(sessionId, { rounds: rounds.slice(0, -1), totals: newTotals });
    } finally {
      setSaving(false);
    }
  }

  async function deleteRound(index) {
    setSaving(true);
    try {
      const newRounds = rounds.filter((_, i) => i !== index);
      const newTotals = recomputeTotals("spades", session, newRounds);
      await updateSession(sessionId, { rounds: newRounds, totals: newTotals });
    } finally {
      setSaving(false);
    }
  }

  async function confirmFinish() {
    setSaving(true);
    try {
      await completeSession(sessionId, { winnerIds: winningTeamPlayers.map((p) => p.id), totals });
      navigate(`/recap/${sessionId}`);
    } finally {
      setSaving(false);
    }
  }

  function toggleNil(id) {
    if (nilPlayers.includes(id)) {
      setNilPlayers((prev) => prev.filter((x) => x !== id));
      setNilResults((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    } else {
      setNilPlayers((prev) => [...prev, id]);
    }
  }

  const scoreTable = (
    <div className="card-surface">
      <h2>Scores (first to {targetScore})</h2>
      <table className="score-table">
        <thead><tr><th>Team</th><th>Total</th></tr></thead>
        <tbody>
          <tr>
            <td><TeamNames players={teamAPlayers} /></td>
            <td className={teamATotal >= teamBTotal && teamATotal > 0 ? "leader" : ""}>{teamATotal}</td>
          </tr>
          <tr>
            <td><TeamNames players={teamBPlayers} /></td>
            <td className={teamBTotal >= teamATotal && teamBTotal > 0 ? "leader" : ""}>{teamBTotal}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const roundHistory = (
    <RoundHistory
      session={session}
      rounds={rounds}
      gameType="spades"
      unitLabel="Hand"
      onDelete={deleteRound}
      busy={saving}
    />
  );

  if (pendingFinish) {
    return (
      <div>
        <h1 className="page-title" style={{ justifyContent: "space-between" }}>
          <span><span className="suit black">♠</span> Spades — Hand {rounds.length + 1}</span>
          <TvMode gameName="Spades" icon="♠" statusLine={`Hand ${rounds.length + 1} · first to ${targetScore}`} rows={tvRows} />
        </h1>
        {scoreTable}
        <div className="card-surface">
          <h2>🏆 {winningTeamPlayers.map((p) => shortName(p)).join(" & ")} reached {targetScore}!</h2>
          <p>Double-check the last hand before locking it in.</p>
          <div className="btn-row">
            <button className="btn ghost" style={backBtnStyle} onClick={undoLastRound} disabled={saving}>
              ← Undo last hand
            </button>
            <button className="btn primary" onClick={confirmFinish} disabled={saving}>
              Confirm winner & finish
            </button>
          </div>
        </div>
        {roundHistory}
      </div>
    );
  }

  // Team B's tricks are always the complement of Team A's out of a full
  // 13-trick hand, so the two entries can never disagree — same
  // mismatch-proof pattern as Euchre 15-card.
  const tricksB = tricksA === null ? null : DEAL_SIZE - tricksA;
  const baseA = tricksA === null ? 0 : bidScore(bidA, tricksA);
  const baseB = tricksB === null ? 0 : bidScore(bidB, tricksB);

  let nilAdjA = 0;
  let nilAdjB = 0;
  for (const [playerId, result] of Object.entries(nilResults)) {
    const swing = result === "success" ? NIL_BONUS : -NIL_BONUS;
    if (teamAIds.includes(playerId)) nilAdjA += swing;
    else if (teamBIds.includes(playerId)) nilAdjB += swing;
  }

  const deltaA = baseA + nilAdjA;
  const deltaB = baseB + nilAdjB;
  const allNilResolved = nilPlayers.every((id) => nilResults[id]);

  async function saveRound() {
    setSaving(true);
    try {
      const newTotals = { ...totals };
      for (const id of teamAIds) newTotals[id] = (newTotals[id] || 0) + deltaA;
      for (const id of teamBIds) newTotals[id] = (newTotals[id] || 0) + deltaB;
      const newRound = {
        roundNumber: rounds.length + 1,
        teamABid: bidA,
        teamBBid: bidB,
        teamATricks: tricksA,
        teamBTricks: tricksB,
        nilResults,
        teamAPoints: deltaA,
        teamBPoints: deltaB,
      };
      await updateSession(sessionId, { rounds: [...rounds, newRound], totals: newTotals });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="page-title" style={{ justifyContent: "space-between" }}>
        <span><span className="suit black">♠</span> Spades — Hand {rounds.length + 1}</span>
        <TvMode gameName="Spades" icon="♠" statusLine={`Hand ${rounds.length + 1} · first to ${targetScore}`} rows={tvRows} />
      </h1>
      {scoreTable}

      {phase === "bidA" && (
        <div className="card-surface">
          <h2>What's <TeamNames players={teamAPlayers} />'s combined bid?</h2>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>
            Don't count any Nil bids here — those get handled separately in a moment.
          </p>
          <NumberPicker
            max={DEAL_SIZE}
            onSelect={(n) => {
              setBidA(n);
              setPhase("bidB");
            }}
          />
        </div>
      )}

      {phase === "bidB" && (
        <div className="card-surface">
          <p><TeamNames players={teamAPlayers} /> bid {bidA}.</p>
          <h2>What's <TeamNames players={teamBPlayers} />'s combined bid?</h2>
          <NumberPicker
            max={DEAL_SIZE}
            onSelect={(n) => {
              setBidB(n);
              setPhase("tricks");
            }}
          />
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button type="button" className="btn ghost" style={backBtnStyle} onClick={() => setPhase("bidA")}>
              ← Back
            </button>
          </div>
        </div>
      )}

      {phase === "tricks" && (
        <div className="card-surface">
          <p><TeamNames players={teamAPlayers} /> bid {bidA} · <TeamNames players={teamBPlayers} /> bid {bidB}</p>
          <h2>How many tricks did <TeamNames players={teamAPlayers} /> win?</h2>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>The other team gets the rest of the {DEAL_SIZE}.</p>
          <NumberPicker
            max={DEAL_SIZE}
            onSelect={(n) => {
              setTricksA(n);
              setPhase("nil");
            }}
          />
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button type="button" className="btn ghost" style={backBtnStyle} onClick={() => setPhase("bidB")}>
              ← Back
            </button>
          </div>
        </div>
      )}

      {phase === "nil" && (
        <div className="card-surface">
          <h2>Did anyone go Nil this hand?</h2>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>
            Tap any player who bid Nil (zero tricks, alone) this hand.
          </p>
          <div className="chip-row">
            {session.players.map((p) => {
              const selected = nilPlayers.includes(p.id);
              return (
                <span
                  key={p.id}
                  className={`player-chip ${selected ? "selected" : ""}`}
                  onClick={() => toggleNil(p.id)}
                >
                  <PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />
                  {shortName(p)}
                </span>
              );
            })}
          </div>
          {nilPlayers.length > 0 && (
            <div style={{ marginTop: 12 }}>
              {nilPlayers.map((id) => {
                const p = session.players.find((pp) => pp.id === id);
                return (
                  <div key={id} className="btn-row" style={{ marginBottom: 8, alignItems: "center" }}>
                    <span style={{ minWidth: 100 }}>
                      <PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />
                      {shortName(p)}
                    </span>
                    <button
                      type="button"
                      className={`btn small ${nilResults[id] === "success" ? "primary" : ""}`}
                      onClick={() => setNilResults((prev) => ({ ...prev, [id]: "success" }))}
                    >
                      ✓ Made it nil
                    </button>
                    <button
                      type="button"
                      className={`btn small ${nilResults[id] === "fail" ? "danger" : ""}`}
                      onClick={() => setNilResults((prev) => ({ ...prev, [id]: "fail" }))}
                    >
                      ✗ Failed nil
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button type="button" className="btn ghost" style={backBtnStyle} onClick={() => setPhase("tricks")}>
              ← Back
            </button>
            <button
              className="btn primary"
              disabled={!allNilResolved}
              onClick={() => setPhase("confirm")}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {phase === "confirm" && (
        <div className="card-surface">
          <h2>Confirm hand {rounds.length + 1}</h2>
          <table className="score-table">
            <thead><tr><th>Team</th><th>Bid</th><th>Tricks</th><th>Nil</th><th>Score</th></tr></thead>
            <tbody>
              <tr>
                <td><TeamNames players={teamAPlayers} /></td>
                <td>{bidA}</td>
                <td>{tricksA}</td>
                <td>{nilAdjA >= 0 ? `+${nilAdjA}` : nilAdjA}</td>
                <td>{deltaA >= 0 ? `+${deltaA}` : deltaA}</td>
              </tr>
              <tr>
                <td><TeamNames players={teamBPlayers} /></td>
                <td>{bidB}</td>
                <td>{tricksB}</td>
                <td>{nilAdjB >= 0 ? `+${nilAdjB}` : nilAdjB}</td>
                <td>{deltaB >= 0 ? `+${deltaB}` : deltaB}</td>
              </tr>
            </tbody>
          </table>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button type="button" className="btn ghost" style={backBtnStyle} onClick={() => setPhase("nil")}>
              ← Edit nils
            </button>
            <button className="btn primary" onClick={saveRound} disabled={saving}>
              {saving ? "Saving…" : "Save hand & continue"}
            </button>
          </div>
        </div>
      )}

      {rounds.length > 0 && phase === "bidA" && (
        <div className="btn-row" style={{ marginBottom: 12 }}>
          <button className="btn ghost" onClick={undoLastRound} disabled={saving}>
            ← Undo last hand
          </button>
        </div>
      )}

      {roundHistory}
    </div>
  );
}
