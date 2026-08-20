import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  subscribeToSession,
  updateSession,
  completeSession,
} from "../../../data/gameSessions";
import PlayerDot from "../../../components/PlayerDot";

function PointsPicker({ onSelect }) {
  return (
    <div className="chip-row">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" className="btn small" onClick={() => onSelect(n)}>
          {n}
        </button>
      ))}
    </div>
  );
}

export default function ThreePlayerPlay() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [results, setResults] = useState({}); // playerId -> { type: 'points'|'set', delta }
  const [scoringIdx, setScoringIdx] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeToSession(sessionId, setSession), [sessionId]);

  // Reset the in-progress hand whenever a hand gets saved (or undone).
  useEffect(() => {
    setResults({});
    setScoringIdx(0);
  }, [session?.rounds?.length]);

  if (!session) return <p className="empty-state">Loading game…</p>;

  if (session.status === "completed") {
    const winners = session.players.filter((p) => session.winnerIds.includes(p.id));
    return (
      <div className="card-surface">
        <h2>Game already finished</h2>
        <p>Winner: {winners.map((p) => p.name).join(", ")}</p>
        <button className="btn primary" onClick={() => navigate("/")}>Back to games</button>
      </div>
    );
  }

  const totals = session.totals || {};
  const rounds = session.rounds || [];
  const lowestTotal = Math.min(...Object.values(totals));
  const pendingFinish = lowestTotal <= 0;
  const potentialWinners = session.players.filter((p) => (totals[p.id] ?? 0) <= 0);

  async function undoLastRound() {
    setSaving(true);
    try {
      const last = rounds[rounds.length - 1];
      const newTotals = { ...totals };
      for (const p of session.players) {
        newTotals[p.id] = (newTotals[p.id] || 0) - (last.deltas[p.id] || 0);
      }
      await updateSession(sessionId, { rounds: rounds.slice(0, -1), totals: newTotals });
    } finally {
      setSaving(false);
    }
  }

  if (pendingFinish) {
    async function confirmFinish() {
      setSaving(true);
      try {
        await completeSession(sessionId, { winnerIds: potentialWinners.map((p) => p.id), totals });
        navigate("/stats");
      } finally {
        setSaving(false);
      }
    }
    return (
      <div>
        <h1 className="page-title"><span className="suit black">♣</span> Euchre (3-player) — Hand complete</h1>
        <div className="card-surface">
          <h2>🏆 {potentialWinners.map((p) => p.name).join(" & ")} reached 0!</h2>
          <table className="score-table">
            <thead><tr><th>Player</th><th>Score</th></tr></thead>
            <tbody>
              {session.players.slice().sort((a, b) => (totals[a.id] ?? 0) - (totals[b.id] ?? 0)).map((p) => (
                <tr key={p.id}>
                  <td><PlayerDot color={p.color} />{p.name}</td>
                  <td className={(totals[p.id] ?? 0) <= 0 ? "leader" : ""}>{totals[p.id] ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
      </div>
    );
  }

  const scoreTable = (
    <div className="card-surface">
      <h2>Scores (first to 0 wins)</h2>
      <table className="score-table">
        <thead><tr><th>Player</th><th>Score</th></tr></thead>
        <tbody>
          {session.players.map((p) => (
            <tr key={p.id}>
              <td><PlayerDot color={p.color} />{p.name}</td>
              <td className={(totals[p.id] ?? 0) === lowestTotal ? "leader" : ""}>{totals[p.id] ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const undoButton = rounds.length > 0 && (
    <div className="btn-row" style={{ marginBottom: 12 }}>
      <button className="btn ghost" style={{ color: "#fdf6e8" }} onClick={undoLastRound} disabled={saving}>
        ← Undo last hand
      </button>
    </div>
  );

  if (scoringIdx >= session.players.length) {
    const pointsTotal = session.players.reduce((sum, p) => {
      const r = results[p.id];
      return r?.type === "points" ? sum + r.value : sum;
    }, 0);
    const pointsMismatch = pointsTotal !== 5;

    async function saveRound() {
      setSaving(true);
      try {
        const deltas = {};
        const newTotals = { ...totals };
        for (const p of session.players) {
          const r = results[p.id];
          const delta = r.type === "set" ? 5 : -r.value;
          deltas[p.id] = delta;
          newTotals[p.id] = (newTotals[p.id] ?? 0) + delta;
        }
        const roundRecord = { roundNumber: rounds.length + 1, results, deltas };
        await updateSession(sessionId, { rounds: [...rounds, roundRecord], totals: newTotals });
      } finally {
        setSaving(false);
      }
    }
    return (
      <div>
        <h1 className="page-title"><span className="suit black">♣</span> Euchre (3-player) — Hand {rounds.length + 1}</h1>
        <div className="card-surface">
          <h2>Hand {rounds.length + 1} scored</h2>
          <table className="score-table">
            <thead><tr><th>Player</th><th>Result</th></tr></thead>
            <tbody>
              {session.players.map((p) => (
                <tr key={p.id}>
                  <td><PlayerDot color={p.color} />{p.name}</td>
                  <td>{results[p.id]?.type === "set" ? "SET (+5)" : `${results[p.id]?.value ?? 0} pts`}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {pointsMismatch && (
            <div className="warning-banner">
              ⚠️ Warning: doesn't add up. Points total {pointsTotal}, but should be 5 per hand. Double-check before saving.
            </div>
          )}
          <div className="btn-row">
            <button
              type="button"
              className="btn ghost"
              style={{ color: "#2b2117", border: "2px solid #6b4226" }}
              onClick={() => setScoringIdx((i) => i - 1)}
            >
              ← Edit last result
            </button>
            <button className="btn primary" onClick={saveRound} disabled={saving}>
              {saving ? "Saving…" : "Save hand & continue"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentPlayer = session.players[scoringIdx];

  return (
    <div>
      <h1 className="page-title"><span className="suit black">♣</span> Euchre (3-player) — Hand {rounds.length + 1}</h1>
      {undoButton}
      <div className="card-surface">
        <h2><PlayerDot color={currentPlayer.color} />{currentPlayer.name} — what happened?</h2>
        <div className="btn-row" style={{ marginBottom: 14 }}>
          <button
            className="btn danger"
            onClick={() => {
              setResults((prev) => ({ ...prev, [currentPlayer.id]: { type: "set", value: null } }));
              setScoringIdx((i) => i + 1);
            }}
          >
            SET (+5)
          </button>
        </div>
        <p>Or got 1-5 points:</p>
        <PointsPicker
          onSelect={(n) => {
            setResults((prev) => ({ ...prev, [currentPlayer.id]: { type: "points", value: n } }));
            setScoringIdx((i) => i + 1);
          }}
        />
        {scoringIdx > 0 && (
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn ghost"
              style={{ color: "#2b2117", border: "2px solid #6b4226" }}
              onClick={() => setScoringIdx((i) => i - 1)}
            >
              ← Back
            </button>
          </div>
        )}
      </div>
      {scoreTable}
    </div>
  );
}
