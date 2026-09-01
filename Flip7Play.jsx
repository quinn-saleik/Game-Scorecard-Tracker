import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  subscribeToSession,
  updateSession,
  completeSession,
} from "../../../data/gameSessions";

export default function Flip7Play() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [inputs, setInputs] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(
    () => subscribeToSession(sessionId, setSession),
    [sessionId]
  );

  if (!session) {
    return <p className="empty-state">Loading game…</p>;
  }

  if (session.status === "completed") {
    return (
      <div className="card-surface">
        <h2>Game already finished</h2>
        <p>Winner: {session.players.filter((p) => session.winnerIds.includes(p.id)).map((p) => p.name).join(", ")}</p>
        <button className="btn primary" onClick={() => navigate("/")}>Back to games</button>
      </div>
    );
  }

  const threshold = session.config?.winThreshold || 200;
  const totals = session.totals || {};
  const rounds = session.rounds || [];
  const leaderTotal = Math.max(0, ...Object.values(totals));
  const pendingFinish = leaderTotal >= threshold;
  const potentialWinners = session.players.filter(
    (p) => (totals[p.id] || 0) === leaderTotal && leaderTotal >= threshold
  );

  async function submitRound(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const roundScores = {};
      const newTotals = { ...totals };
      for (const p of session.players) {
        const val = Number(inputs[p.id]) || 0;
        roundScores[p.id] = val;
        newTotals[p.id] = (newTotals[p.id] || 0) + val;
      }
      const newRound = { roundNumber: rounds.length + 1, scores: roundScores };
      await updateSession(sessionId, {
        rounds: [...rounds, newRound],
        totals: newTotals,
      });
      setInputs({});
    } finally {
      setSaving(false);
    }
  }

  async function undoLastRound() {
    setSaving(true);
    try {
      const last = rounds[rounds.length - 1];
      const newTotals = { ...totals };
      for (const p of session.players) {
        newTotals[p.id] = (newTotals[p.id] || 0) - (last.scores[p.id] || 0);
      }
      await updateSession(sessionId, {
        rounds: rounds.slice(0, -1),
        totals: newTotals,
      });
    } finally {
      setSaving(false);
    }
  }

  async function confirmFinish() {
    setSaving(true);
    try {
      await completeSession(sessionId, {
        winnerIds: potentialWinners.map((p) => p.id),
        totals,
      });
      navigate("/stats");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">
        <span className="suit red">🔥</span> Flip7 — Round {rounds.length + 1}
      </h1>

      <div className="card-surface">
        <h2>Scores (first to {threshold})</h2>
        <table className="score-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {session.players.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td className={(totals[p.id] || 0) === leaderTotal && leaderTotal > 0 ? "leader" : ""}>
                  {totals[p.id] || 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pendingFinish ? (
        <div className="card-surface">
          <h2>🏆 {potentialWinners.map((p) => p.name).join(" & ")} reached {threshold}!</h2>
          <p>Double-check the last round before locking it in.</p>
          <div className="btn-row">
            <button className="btn ghost" style={{ color: "#2b2117", border: "2px solid #6b4226" }} onClick={undoLastRound} disabled={saving}>
              ← Undo last round
            </button>
            <button className="btn primary" onClick={confirmFinish} disabled={saving}>
              Confirm winner & finish
            </button>
          </div>
        </div>
      ) : (
        <div className="card-surface">
          <h2>Add round {rounds.length + 1} scores</h2>
          <form onSubmit={submitRound}>
            {session.players.map((p) => (
              <div className="field" key={p.id}>
                <label htmlFor={`pt-${p.id}`}>{p.name}</label>
                <input
                  id={`pt-${p.id}`}
                  className="input"
                  type="number"
                  placeholder="0"
                  value={inputs[p.id] ?? ""}
                  onChange={(e) =>
                    setInputs((prev) => ({ ...prev, [p.id]: e.target.value }))
                  }
                />
              </div>
            ))}
            <div className="btn-row">
              {rounds.length > 0 && (
                <button
                  type="button"
                  className="btn ghost"
                  style={{ color: "#2b2117", border: "2px solid #6b4226" }}
                  onClick={undoLastRound}
                  disabled={saving}
                >
                  ← Undo last round
                </button>
              )}
              <button className="btn primary" type="submit" disabled={saving}>
                Save round
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
