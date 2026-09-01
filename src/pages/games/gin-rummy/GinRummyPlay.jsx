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
import VoiceInputButton from "../../../components/VoiceInputButton";
import { recomputeTotals } from "../../../data/rounds";

const GIN_BONUS = 20;

export default function GinRummyPlay() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [winnerPick, setWinnerPick] = useState(null); // playerId | "redeal" | null
  const [handPoints, setHandPoints] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeToSession(sessionId, setSession), [sessionId]);

  // Reset the in-progress hand picker whenever a hand gets saved (or undone).
  useEffect(() => {
    setWinnerPick(null);
    setHandPoints("");
  }, [session?.rounds?.length]);

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

  const targetScore = session.config?.targetScore || 100;
  const totals = session.totals || {};
  const rounds = session.rounds || [];
  const leaderTotal = Math.max(0, ...Object.values(totals));
  const pendingFinish = leaderTotal >= targetScore;
  const potentialWinners = session.players.filter(
    (p) => (totals[p.id] || 0) >= targetScore
  );

  async function undoLastRound() {
    setSaving(true);
    try {
      const last = rounds[rounds.length - 1];
      const newTotals = { ...totals };
      if (last) {
        newTotals[last.winnerId] = (newTotals[last.winnerId] || 0) - (last.pointsAwarded || 0);
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
      const newTotals = recomputeTotals("gin-rummy", session, newRounds);
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

  function continueRedeal() {
    // No score this hand — nothing to save, just reset back to the picker.
    setWinnerPick(null);
    setHandPoints("");
  }

  async function saveHand() {
    setSaving(true);
    try {
      const points = Number(handPoints) || 0;
      const pointsAwarded = points + GIN_BONUS;
      const newTotals = { ...totals };
      newTotals[winnerPick] = (newTotals[winnerPick] || 0) + pointsAwarded;
      const newRound = {
        roundNumber: rounds.length + 1,
        winnerId: winnerPick,
        handPoints: points,
        pointsAwarded,
      };
      await updateSession(sessionId, { rounds: [...rounds, newRound], totals: newTotals });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">
        <span className="suit red">♥</span> Gin Rummy — Hand {rounds.length + 1}
      </h1>

      <div className="card-surface">
        <h2>Standings (first to {targetScore})</h2>
        <table className="score-table">
          <thead><tr><th>Player</th><th>Total</th></tr></thead>
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
          <h2>🏆 {potentialWinners.map((p) => shortName(p)).join(" & ")} wins!</h2>
          <p>Double-check the last hand before locking it in.</p>
          <div className="btn-row">
            <button className="btn ghost" style={{ color: "var(--text-on-surface)", border: "2px solid #6b4226" }} onClick={undoLastRound} disabled={saving}>
              ← Undo last hand
            </button>
            <button className="btn primary" onClick={confirmFinish} disabled={saving}>
              Confirm winner & finish
            </button>
          </div>
        </div>
      ) : (
        <div className="card-surface">
          <h2>Add hand {rounds.length + 1} result</h2>
          <div className="chip-row">
            {session.players.map((p) => (
              <span
                key={p.id}
                className={`player-chip ${winnerPick === p.id ? "selected" : ""}`}
                onClick={() => setWinnerPick(p.id)}
              >
                <PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />
                {shortName(p)} won
              </span>
            ))}
            <span
              className={`player-chip ${winnerPick === "redeal" ? "selected" : ""}`}
              onClick={() => setWinnerPick("redeal")}
            >
              No score (redeal)
            </span>
          </div>

          {winnerPick === "redeal" && (
            <div className="btn-row" style={{ marginTop: 12 }}>
              <button className="btn primary" onClick={continueRedeal}>Continue</button>
            </div>
          )}

          {winnerPick && winnerPick !== "redeal" && (
            <div className="field" style={{ marginTop: 12 }}>
              <label htmlFor="handPoints">Hand points (deadwood difference)</label>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  id="handPoints"
                  className="input"
                  type="number"
                  placeholder="0"
                  value={handPoints}
                  onChange={(e) => setHandPoints(e.target.value)}
                />
                <VoiceInputButton onResult={(v) => setHandPoints(v)} />
              </div>
              <p style={{ color: "var(--muted)", fontSize: 13 }}>
                The app adds +{GIN_BONUS} automatically for winning the hand.
              </p>
              <div className="btn-row">
                {rounds.length > 0 && (
                  <button type="button" className="btn ghost" style={{ color: "var(--text-on-surface)", border: "2px solid #6b4226" }} onClick={undoLastRound} disabled={saving}>
                    ← Undo last hand
                  </button>
                )}
                <button className="btn primary" onClick={saveHand} disabled={saving}>
                  {saving ? "Saving…" : "Save hand"}
                </button>
              </div>
            </div>
          )}

          {!winnerPick && rounds.length > 0 && (
            <div className="btn-row" style={{ marginTop: 12 }}>
              <button type="button" className="btn ghost" style={{ color: "var(--text-on-surface)", border: "2px solid #6b4226" }} onClick={undoLastRound} disabled={saving}>
                ← Undo last hand
              </button>
            </div>
          )}
        </div>
      )}

      <RoundHistory
        session={session}
        rounds={rounds}
        gameType="gin-rummy"
        unitLabel="Hand"
        onDelete={deleteRound}
        busy={saving}
      />
    </div>
  );
}
