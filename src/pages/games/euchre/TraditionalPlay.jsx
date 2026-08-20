import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  subscribeToSession,
  updateSession,
  completeSession,
} from "../../../data/gameSessions";
import PlayerDot from "../../../components/PlayerDot";

function TeamNames({ players }) {
  return players.map((p, i) => (
    <span key={p.id}>
      {i > 0 && " & "}
      <PlayerDot color={p.color} />{p.name}
    </span>
  ));
}

export default function TraditionalPlay() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [inputA, setInputA] = useState("");
  const [inputB, setInputB] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeToSession(sessionId, setSession), [sessionId]);

  if (!session) return <p className="empty-state">Loading game…</p>;

  if (session.status === "completed") {
    const winners = session.players.filter((p) => session.winnerIds.includes(p.id));
    return (
      <div className="card-surface">
        <h2>Game already finished</h2>
        <p>Winning team: {winners.map((p) => p.name).join(" & ")}</p>
        <button className="btn primary" onClick={() => navigate("/")}>Back to games</button>
      </div>
    );
  }

  const threshold = session.config?.winThreshold || 10;
  const teamAIds = session.config?.teamA || [];
  const teamBIds = session.config?.teamB || [];
  const totals = session.totals || {};
  const rounds = session.rounds || [];
  const teamAPlayers = session.players.filter((p) => teamAIds.includes(p.id));
  const teamBPlayers = session.players.filter((p) => teamBIds.includes(p.id));
  const teamATotal = totals[teamAIds[0]] || 0;
  const teamBTotal = totals[teamBIds[0]] || 0;
  const pendingFinish = teamATotal >= threshold || teamBTotal >= threshold;
  const aWins = teamATotal >= threshold && teamATotal >= teamBTotal;
  const winningTeamPlayers = aWins ? teamAPlayers : teamBPlayers;

  async function submitRound(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const aPts = Number(inputA) || 0;
      const bPts = Number(inputB) || 0;
      const newTotals = { ...totals };
      for (const id of teamAIds) newTotals[id] = (newTotals[id] || 0) + aPts;
      for (const id of teamBIds) newTotals[id] = (newTotals[id] || 0) + bPts;
      const newRound = { roundNumber: rounds.length + 1, teamAPoints: aPts, teamBPoints: bPts };
      await updateSession(sessionId, { rounds: [...rounds, newRound], totals: newTotals });
      setInputA("");
      setInputB("");
    } finally {
      setSaving(false);
    }
  }

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

  async function confirmFinish() {
    setSaving(true);
    try {
      await completeSession(sessionId, { winnerIds: winningTeamPlayers.map((p) => p.id), totals });
      navigate("/stats");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="page-title"><span className="suit black">♣</span> Euchre — Hand {rounds.length + 1}</h1>

      <div className="card-surface">
        <h2>Scores (first to {threshold})</h2>
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

      {pendingFinish ? (
        <div className="card-surface">
          <h2>🏆 {winningTeamPlayers.map((p) => p.name).join(" & ")} reached {threshold}!</h2>
          <p>Double-check the last hand before locking it in.</p>
          <div className="btn-row">
            <button className="btn ghost" style={{ color: "#2b2117", border: "2px solid #6b4226" }} onClick={undoLastRound} disabled={saving}>
              ← Undo last hand
            </button>
            <button className="btn primary" onClick={confirmFinish} disabled={saving}>
              Confirm winner & finish
            </button>
          </div>
        </div>
      ) : (
        <div className="card-surface">
          <h2>Add hand {rounds.length + 1} points</h2>
          <form onSubmit={submitRound}>
            <div className="field">
              <label htmlFor="teamA"><TeamNames players={teamAPlayers} /></label>
              <input id="teamA" className="input" type="number" placeholder="0" value={inputA} onChange={(e) => setInputA(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="teamB"><TeamNames players={teamBPlayers} /></label>
              <input id="teamB" className="input" type="number" placeholder="0" value={inputB} onChange={(e) => setInputB(e.target.value)} />
            </div>
            <div className="btn-row">
              {rounds.length > 0 && (
                <button type="button" className="btn ghost" style={{ color: "#2b2117", border: "2px solid #6b4226" }} onClick={undoLastRound} disabled={saving}>
                  ← Undo last hand
                </button>
              )}
              <button className="btn primary" type="submit" disabled={saving}>Save hand</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
