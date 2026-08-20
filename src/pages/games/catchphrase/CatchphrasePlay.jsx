import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  subscribeToSession,
  updateSession,
  completeSession,
} from "../../../data/gameSessions";
import PlayerDot from "../../../components/PlayerDot";
import RoundHistory from "../../../components/RoundHistory";
import { recomputeTotals } from "../../../data/rounds";

function TeamNames({ players }) {
  return players.map((p, i) => (
    <span key={p.id}>
      {i > 0 && " & "}
      <PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />{p.name}
    </span>
  ));
}

export default function CatchphrasePlay() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
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

  const threshold = session.config?.winThreshold || 7;
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

  async function addPoint(team) {
    setSaving(true);
    try {
      const aPts = team === "A" ? 1 : 0;
      const bPts = team === "B" ? 1 : 0;
      const newTotals = { ...totals };
      for (const id of teamAIds) newTotals[id] = (newTotals[id] || 0) + aPts;
      for (const id of teamBIds) newTotals[id] = (newTotals[id] || 0) + bPts;
      const newRound = { roundNumber: rounds.length + 1, teamAPoints: aPts, teamBPoints: bPts };
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
      const newTotals = recomputeTotals("catchphrase", session, newRounds);
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

  return (
    <div>
      <h1 className="page-title"><span className="suit red">🎤</span> Catchphrase</h1>

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
          <p>Double-check the last point before locking it in.</p>
          <div className="btn-row">
            <button className="btn ghost" style={{ color: "var(--text-on-surface)", border: "2px solid #6b4226" }} onClick={undoLastRound} disabled={saving}>
              ← Undo last point
            </button>
            <button className="btn primary" onClick={confirmFinish} disabled={saving}>
              Confirm winner & finish
            </button>
          </div>
        </div>
      ) : (
        <div className="card-surface">
          <h2>Who guessed it?</h2>
          <div className="btn-row">
            <button className="btn primary" style={{ flex: 1 }} onClick={() => addPoint("A")} disabled={saving}>
              +1 <TeamNames players={teamAPlayers} />
            </button>
            <button className="btn primary" style={{ flex: 1 }} onClick={() => addPoint("B")} disabled={saving}>
              +1 <TeamNames players={teamBPlayers} />
            </button>
          </div>
          {rounds.length > 0 && (
            <div className="btn-row" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="btn ghost"
                style={{ color: "var(--text-on-surface)", border: "2px solid #6b4226" }}
                onClick={undoLastRound}
                disabled={saving}
              >
                ← Undo last point
              </button>
            </div>
          )}
        </div>
      )}

      <RoundHistory
        session={session}
        rounds={rounds}
        gameType="catchphrase"
        unitLabel="Round"
        onDelete={deleteRound}
        busy={saving}
      />
    </div>
  );
}
