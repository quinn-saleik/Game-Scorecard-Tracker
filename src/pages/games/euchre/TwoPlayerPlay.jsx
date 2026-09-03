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
import ScorePresets from "../../../components/ScorePresets";
import VoiceInputButton from "../../../components/VoiceInputButton";
import TvMode from "../../../components/TvMode";
import { recomputeTotals } from "../../../data/rounds";

export default function TwoPlayerPlay() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [inputs, setInputs] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeToSession(sessionId, setSession), [sessionId]);

  if (!session) return <p className="empty-state">Loading game…</p>;

  if (session.status === "completed") {
    const winners = session.players.filter((p) => session.winnerIds.includes(p.id));
    return (
      <div className="card-surface">
        <h2>Game already finished</h2>
        <p>Winner: {winners.map((p) => shortName(p)).join(", ")}</p>
        <button className="btn primary" onClick={() => navigate("/")}>Back to games</button>
      </div>
    );
  }

  const threshold = session.config?.winThreshold || 50;
  const totals = session.totals || {};
  const rounds = session.rounds || [];
  const leaderTotal = Math.max(0, ...Object.values(totals));
  const pendingFinish = leaderTotal >= threshold;
  const potentialWinners = session.players.filter(
    (p) => (totals[p.id] || 0) === leaderTotal && leaderTotal >= threshold
  );
  // Dealer alternates every hand, starting with the player picked first at setup.
  const dealer = session.players[rounds.length % session.players.length];
  const tvRows = session.players
    .slice()
    .sort((a, b) => (totals[b.id] || 0) - (totals[a.id] || 0))
    .map((p) => ({
      key: p.id,
      label: p.name,
      score: totals[p.id] || 0,
      isLeader: (totals[p.id] || 0) === leaderTotal && leaderTotal > 0,
      color: p.color,
      avatar: p.avatar,
      photo: p.photo,
    }));

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
      const newRound = { roundNumber: rounds.length + 1, dealerId: dealer.id, scores: roundScores };
      await updateSession(sessionId, { rounds: [...rounds, newRound], totals: newTotals });
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
      await updateSession(sessionId, { rounds: rounds.slice(0, -1), totals: newTotals });
    } finally {
      setSaving(false);
    }
  }

  async function deleteRound(index) {
    setSaving(true);
    try {
      const newRounds = rounds.filter((_, i) => i !== index);
      const newTotals = recomputeTotals("euchre-2p", session, newRounds);
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
        <span><span className="suit black">♣</span> Euchre — Hand {rounds.length + 1}</span>
        <TvMode gameName="Euchre" icon="♣" statusLine={`Hand ${rounds.length + 1} · first to ${threshold}`} rows={tvRows} />
      </h1>

      <div className="card-surface">
        <h2>Scores (first to {threshold})</h2>
        <table className="score-table">
          <thead><tr><th>Player</th><th>Total</th></tr></thead>
          <tbody>
            {session.players.map((p) => (
              <tr key={p.id}>
                <td><PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />{shortName(p)}{!pendingFinish && p.id === dealer.id ? " 🃏" : ""}</td>
                <td className={(totals[p.id] || 0) === leaderTotal && leaderTotal > 0 ? "leader" : ""}>
                  {totals[p.id] || 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!pendingFinish && <p style={{ color: "var(--muted)", fontSize: 13 }}>🃏 = dealing this hand</p>}
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
          <h2>Add hand {rounds.length + 1} scores</h2>
          <form onSubmit={submitRound}>
            {session.players.map((p) => (
              <div className="field" key={p.id}>
                <label htmlFor={`pt-${p.id}`}><PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />{shortName(p)}{p.id === dealer.id ? " (dealer)" : ""}</label>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input
                    id={`pt-${p.id}`}
                    className="input"
                    type="number"
                    placeholder="0"
                    value={inputs[p.id] ?? ""}
                    onChange={(e) => setInputs((prev) => ({ ...prev, [p.id]: e.target.value }))}
                  />
                  <VoiceInputButton
                    onResult={(v) => setInputs((prev) => ({ ...prev, [p.id]: v }))}
                  />
                </div>
                <ScorePresets
                  values={[1, 2, 4]}
                  onPick={(v) => setInputs((prev) => ({ ...prev, [p.id]: String(v) }))}
                />
              </div>
            ))}
            <div className="btn-row">
              {rounds.length > 0 && (
                <button type="button" className="btn ghost" style={{ color: "var(--text-on-surface)", border: "2px solid var(--wood)" }} onClick={undoLastRound} disabled={saving}>
                  ← Undo last hand
                </button>
              )}
              <button className="btn primary" type="submit" disabled={saving}>Save hand</button>
            </div>
          </form>
        </div>
      )}

      <RoundHistory
        session={session}
        rounds={rounds}
        gameType="euchre-2p"
        unitLabel="Hand"
        onDelete={deleteRound}
        busy={saving}
      />
    </div>
  );
}
