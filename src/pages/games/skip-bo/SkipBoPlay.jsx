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

export default function SkipBoPlay() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeToSession(sessionId, setSession), [sessionId]);

  if (!session) return <p className="empty-state">Loading game…</p>;

  if (session.status === "completed") {
    return (
      <div className="card-surface">
        <h2>Game already finished</h2>
        <p>Winner: {session.players.filter((p) => session.winnerIds.includes(p.id)).map((p) => shortName(p)).join(", ")}</p>
        <button className="btn primary" onClick={() => navigate("/")}>Back to games</button>
      </div>
    );
  }

  const threshold = session.config?.winThreshold || 3;
  const totals = session.totals || {};
  const rounds = session.rounds || [];
  const leaderTotal = Math.max(0, ...Object.values(totals));
  const pendingFinish = leaderTotal >= threshold;
  const potentialWinners = session.players.filter(
    (p) => (totals[p.id] || 0) === leaderTotal && leaderTotal >= threshold
  );

  const tvRows = session.players
    .slice()
    .sort((a, b) => (totals[b.id] || 0) - (totals[a.id] || 0))
    .map((p) => ({
      key: p.id,
      label: shortName(p),
      score: totals[p.id] || 0,
      isLeader: (totals[p.id] || 0) === leaderTotal && leaderTotal > 0,
      color: p.color,
      avatar: p.avatar,
      photo: p.photo,
    }));

  async function recordWinner(playerId) {
    setSaving(true);
    try {
      const newTotals = { ...totals, [playerId]: (totals[playerId] || 0) + 1 };
      const newRound = { roundNumber: rounds.length + 1, winnerId: playerId };
      await updateSession(sessionId, { rounds: [...rounds, newRound], totals: newTotals });
    } finally {
      setSaving(false);
    }
  }

  async function undoLastRound() {
    setSaving(true);
    try {
      const last = rounds[rounds.length - 1];
      const newTotals = { ...totals };
      newTotals[last.winnerId] = (newTotals[last.winnerId] || 0) - 1;
      await updateSession(sessionId, { rounds: rounds.slice(0, -1), totals: newTotals });
    } finally {
      setSaving(false);
    }
  }

  async function deleteRound(index) {
    setSaving(true);
    try {
      const newRounds = rounds.filter((_, i) => i !== index);
      const newTotals = recomputeTotals("skip-bo", session, newRounds);
      await updateSession(sessionId, { rounds: newRounds, totals: newTotals });
    } finally {
      setSaving(false);
    }
  }

  async function confirmFinish() {
    setSaving(true);
    try {
      await completeSession(sessionId, { winnerIds: potentialWinners.map((p) => p.id), totals });
      navigate(`/recap/${sessionId}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="page-title" style={{ justifyContent: "space-between" }}>
        <span><span className="suit red">🔢</span> Skip-Bo</span>
        <TvMode gameName="Skip-Bo" icon="🔢" statusLine={`Hand ${rounds.length + 1} · first to ${threshold}`} rows={tvRows} />
      </h1>

      <div className="card-surface">
        <h2>Wins (first to {threshold})</h2>
        <table className="score-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>Wins</th>
            </tr>
          </thead>
          <tbody>
            {session.players.map((p) => (
              <tr key={p.id}>
                <td><PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />{shortName(p)}</td>
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
          <h2>🏆 {potentialWinners.map((p) => shortName(p)).join(" & ")} reached {threshold}!</h2>
          <p>Double-check the last hand before locking it in.</p>
          <div className="btn-row">
            <button className="btn ghost" style={{ color: "var(--text-on-surface)", border: "2px solid var(--wood)" }} onClick={undoLastRound} disabled={saving}>
              ← Undo last hand
            </button>
            <button className="btn primary" onClick={confirmFinish} disabled={saving}>
              Confirm winner & finish
            </button>
          </div>
        </div>
      ) : (
        <div className="card-surface">
          <h2>Who emptied their stockpile first?</h2>
          <div className="chip-row">
            {session.players.map((p) => (
              <span
                key={p.id}
                className="player-chip"
                onClick={() => !saving && recordWinner(p.id)}
                style={{ cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1 }}
              >
                <PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />
                {shortName(p)}
              </span>
            ))}
          </div>
          {rounds.length > 0 && (
            <div className="btn-row" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="btn ghost"
                style={{ color: "var(--text-on-surface)", border: "2px solid var(--wood)" }}
                onClick={undoLastRound}
                disabled={saving}
              >
                ← Undo last hand
              </button>
            </div>
          )}
        </div>
      )}

      <RoundHistory
        session={session}
        rounds={rounds}
        gameType="skip-bo"
        unitLabel="Hand"
        onDelete={deleteRound}
        busy={saving}
      />
    </div>
  );
}
