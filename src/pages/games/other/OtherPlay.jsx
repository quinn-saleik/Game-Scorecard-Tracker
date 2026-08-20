import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  subscribeToSession,
  updateSession,
  completeSession,
} from "../../../data/gameSessions";
import PlayerDot from "../../../components/PlayerDot";
import RoundHistory from "../../../components/RoundHistory";
import ScorePresets from "../../../components/ScorePresets";
import VoiceInputButton from "../../../components/VoiceInputButton";
import { recomputeTotals } from "../../../data/rounds";

export default function OtherPlay() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [inputs, setInputs] = useState({});
  const [finishing, setFinishing] = useState(false);
  const [selectedWinners, setSelectedWinners] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeToSession(sessionId, setSession), [sessionId]);

  if (!session) {
    return <p className="empty-state">Loading game…</p>;
  }

  const gameName = session.config?.customName || session.gameLabel || "Other";

  if (session.status === "completed") {
    const winners = session.players.filter((p) => session.winnerIds.includes(p.id));
    return (
      <div className="card-surface">
        <h2>{gameName} already finished</h2>
        <p>Winner: {winners.map((p) => p.name).join(", ")}</p>
        <button className="btn primary" onClick={() => navigate("/")}>Back to games</button>
      </div>
    );
  }

  const totals = session.totals || {};
  const rounds = session.rounds || [];
  const leaderTotal = Math.max(0, ...Object.values(totals));

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
      const newTotals = recomputeTotals("other", session, newRounds);
      await updateSession(sessionId, { rounds: newRounds, totals: newTotals });
    } finally {
      setSaving(false);
    }
  }

  function openFinish() {
    // Default-check whoever's currently leading — still fully adjustable,
    // since for some "Other" games the highest number doesn't mean winner.
    setSelectedWinners(session.players.filter((p) => (totals[p.id] || 0) === leaderTotal && leaderTotal > 0).map((p) => p.id));
    setFinishing(true);
  }

  function toggleWinner(id) {
    setSelectedWinners((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function confirmFinish() {
    setSaving(true);
    try {
      await completeSession(sessionId, { winnerIds: selectedWinners, totals });
      navigate(`/recap/${sessionId}`);
    } finally {
      setSaving(false);
    }
  }

  if (finishing) {
    return (
      <div>
        <h1 className="page-title"><span className="suit black">🃏</span> {gameName} — Finish game</h1>
        <div className="card-surface">
          <h2>Who won?</h2>
          <p style={{ color: "var(--muted)", fontSize: 14 }}>Tap to select — pick as many as apply (ties, teams, etc.), scores don't have to decide it.</p>
          <div className="chip-row">
            {session.players.map((p) => (
              <span
                key={p.id}
                className={`player-chip ${selectedWinners.includes(p.id) ? "selected" : ""}`}
                onClick={() => toggleWinner(p.id)}
              >
                <PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />
                {p.name} ({totals[p.id] || 0})
              </span>
            ))}
          </div>
          <div className="btn-row" style={{ marginTop: 14 }}>
            <button
              type="button"
              className="btn ghost"
              style={{ color: "var(--text-on-surface)", border: "2px solid #6b4226" }}
              onClick={() => setFinishing(false)}
              disabled={saving}
            >
              ← Back to scoring
            </button>
            <button className="btn primary" onClick={confirmFinish} disabled={saving || selectedWinners.length === 0}>
              Confirm winner & finish
            </button>
          </div>
          {selectedWinners.length === 0 && (
            <p className="empty-state">Pick at least one winner to finish.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title"><span className="suit black">🃏</span> {gameName} — Round {rounds.length + 1}</h1>

      <div className="card-surface">
        <h2>Scores</h2>
        <table className="score-table">
          <thead><tr><th>Player</th><th>Total</th></tr></thead>
          <tbody>
            {session.players.map((p) => (
              <tr key={p.id}>
                <td><PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />{p.name}</td>
                <td className={(totals[p.id] || 0) === leaderTotal && leaderTotal > 0 ? "leader" : ""}>
                  {totals[p.id] || 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card-surface">
        <h2>Add round {rounds.length + 1} scores</h2>
        <form onSubmit={submitRound}>
          {session.players.map((p) => (
            <div className="field" key={p.id}>
              <label htmlFor={`pt-${p.id}`}><PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />{p.name}</label>
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
                values={[0]}
                onPick={(v) => setInputs((prev) => ({ ...prev, [p.id]: String(v) }))}
              />
            </div>
          ))}
          <div className="btn-row">
            {rounds.length > 0 && (
              <button
                type="button"
                className="btn ghost"
                style={{ color: "var(--text-on-surface)", border: "2px solid #6b4226" }}
                onClick={undoLastRound}
                disabled={saving}
              >
                ← Undo last round
              </button>
            )}
            <button className="btn primary" type="submit" disabled={saving}>Save round</button>
          </div>
        </form>
      </div>

      <button className="btn primary" onClick={openFinish} disabled={saving}>
        🏁 Finish game
      </button>

      <RoundHistory
        session={session}
        rounds={rounds}
        gameType="other"
        unitLabel="Round"
        onDelete={deleteRound}
        busy={saving}
      />
    </div>
  );
}
