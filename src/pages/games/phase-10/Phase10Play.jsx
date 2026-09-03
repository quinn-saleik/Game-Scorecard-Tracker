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
import TvMode from "../../../components/TvMode";
import { recomputeTotals } from "../../../data/rounds";

const TOTAL_PHASES = 10;

// Phases are sequential — nobody skips ahead — so all we need per player is
// how many hands they've been marked "completed" on. Their current phase is
// just that count + 1 (capped once they've cleared all 10).
function completedCountFor(playerId, rounds) {
  return rounds.filter((r) => r.completed?.[playerId]).length;
}

export default function Phase10Play() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [phase, setPhase] = useState("phase"); // phase | points | confirm
  const [completedPicks, setCompletedPicks] = useState({}); // playerId -> bool
  const [pointsInput, setPointsInput] = useState({}); // playerId -> string
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeToSession(sessionId, setSession), [sessionId]);

  // Reset the in-progress hand whenever one gets saved (or undone).
  useEffect(() => {
    setPhase("phase");
    setCompletedPicks({});
    setPointsInput({});
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

  const totals = session.totals || {};
  const rounds = session.rounds || [];

  const doneCounts = Object.fromEntries(
    session.players.map((p) => [p.id, completedCountFor(p.id, rounds)])
  );
  const finishers = session.players.filter((p) => doneCounts[p.id] >= TOTAL_PHASES);
  const pendingFinish = finishers.length > 0;
  const lowestAmongFinishers = pendingFinish
    ? Math.min(...finishers.map((p) => totals[p.id] ?? 0))
    : null;
  const potentialWinners = pendingFinish
    ? finishers.filter((p) => (totals[p.id] ?? 0) === lowestAmongFinishers)
    : [];

  const lowestTotal = Math.min(0, ...Object.values(totals));
  const tvRows = session.players
    .slice()
    .sort((a, b) => (totals[a.id] ?? 0) - (totals[b.id] ?? 0))
    .map((p) => ({
      key: p.id,
      label: p.name + (doneCounts[p.id] >= TOTAL_PHASES ? " ✅" : ` (phase ${doneCounts[p.id] + 1})`),
      score: totals[p.id] ?? 0,
      isLeader: (totals[p.id] ?? 0) === lowestTotal,
      color: p.color,
      avatar: p.avatar,
      photo: p.photo,
    }));

  async function undoLastRound() {
    setSaving(true);
    try {
      const last = rounds[rounds.length - 1];
      const newTotals = { ...totals };
      for (const p of session.players) {
        newTotals[p.id] = (newTotals[p.id] ?? 0) - (last.points?.[p.id] || 0);
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
      const newTotals = recomputeTotals("phase-10", session, newRounds);
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

  async function saveRound() {
    setSaving(true);
    try {
      const points = {};
      const newTotals = { ...totals };
      for (const p of session.players) {
        const val = Number(pointsInput[p.id]) || 0;
        points[p.id] = val;
        newTotals[p.id] = (newTotals[p.id] ?? 0) + val;
      }
      const newRound = {
        roundNumber: rounds.length + 1,
        completed: completedPicks,
        points,
      };
      await updateSession(sessionId, { rounds: [...rounds, newRound], totals: newTotals });
    } finally {
      setSaving(false);
    }
  }

  const scoreTable = (
    <div className="card-surface">
      <h2>Standings</h2>
      <table className="score-table">
        <thead>
          <tr>
            <th>Player</th>
            <th>Phase</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {session.players.map((p) => {
            const done = doneCounts[p.id];
            return (
              <tr key={p.id}>
                <td><PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />{shortName(p)}</td>
                <td>{done >= TOTAL_PHASES ? "✅ Done" : `${done + 1} of ${TOTAL_PHASES}`}</td>
                <td className={(totals[p.id] ?? 0) === lowestTotal ? "leader" : ""}>{totals[p.id] ?? 0}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const roundHistory = (
    <RoundHistory
      session={session}
      rounds={rounds}
      gameType="phase-10"
      unitLabel="Hand"
      onDelete={deleteRound}
      busy={saving}
    />
  );

  if (pendingFinish) {
    return (
      <div>
        <h1 className="page-title" style={{ justifyContent: "space-between" }}>
          <span><span className="suit black">🔟</span> Phase 10 — Hand {rounds.length + 1}</span>
          <TvMode gameName="Phase 10" icon="🔟" statusLine={`Hand ${rounds.length + 1} · lowest score among finishers wins`} rows={tvRows} />
        </h1>
        {scoreTable}
        <div className="card-surface">
          <h2>🏆 {potentialWinners.map((p) => shortName(p)).join(" & ")} cleared all 10 phases with the lowest score!</h2>
          <p>Double-check the last hand before locking it in.</p>
          <div className="btn-row">
            {rounds.length > 0 && (
              <button className="btn ghost" style={{ color: "var(--text-on-surface)", border: "2px solid var(--wood)" }} onClick={undoLastRound} disabled={saving}>
                ← Undo last hand
              </button>
            )}
            <button className="btn primary" onClick={confirmFinish} disabled={saving}>
              Confirm winner & finish
            </button>
          </div>
        </div>
        {roundHistory}
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title"><span className="suit black">🔟</span> Phase 10 — Hand {rounds.length + 1}</h1>
      {scoreTable}

      {phase === "phase" && (
        <div className="card-surface">
          <h2>Who completed their phase this hand?</h2>
          {session.players.map((p) => (
            <div key={p.id} style={{ marginBottom: 10 }}>
              <span
                className={`player-chip ${completedPicks[p.id] ? "selected" : ""}`}
                onClick={() => setCompletedPicks((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
              >
                <PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />
                {shortName(p)} — phase {doneCounts[p.id] + 1}
                {completedPicks[p.id] ? " ✅" : ""}
              </span>
            </div>
          ))}
          <div className="btn-row">
            <button className="btn primary" onClick={() => setPhase("points")}>Continue</button>
          </div>
        </div>
      )}

      {phase === "points" && (
        <div className="card-surface">
          <h2>Leftover points</h2>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>
            Everyone enters the points left in their hand — completing a phase doesn't zero it
            out, it just advances them to the next phase.
          </p>
          {session.players.map((p) => (
            <div className="field" key={p.id}>
              <label htmlFor={`pts-${p.id}`}>
                <PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />{shortName(p)}
                {completedPicks[p.id] ? " — completed their phase" : ""}
              </label>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  id={`pts-${p.id}`}
                  className="input"
                  type="number"
                  placeholder="0"
                  value={pointsInput[p.id] ?? ""}
                  onChange={(e) => setPointsInput((prev) => ({ ...prev, [p.id]: e.target.value }))}
                />
                <VoiceInputButton
                  onResult={(v) => setPointsInput((prev) => ({ ...prev, [p.id]: v }))}
                />
              </div>
            </div>
          ))}
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button type="button" className="btn ghost" style={{ color: "var(--text-on-surface)", border: "2px solid var(--wood)" }} onClick={() => setPhase("phase")}>
              ← Back
            </button>
            <button className="btn primary" onClick={() => setPhase("confirm")}>Continue</button>
          </div>
        </div>
      )}

      {phase === "confirm" && (
        <div className="card-surface">
          <h2>Confirm hand {rounds.length + 1}</h2>
          <table className="score-table">
            <thead><tr><th>Player</th><th>Phase</th><th>Points</th></tr></thead>
            <tbody>
              {session.players.map((p) => {
                const pts = Number(pointsInput[p.id]) || 0;
                return (
                  <tr key={p.id}>
                    <td><PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />{shortName(p)}</td>
                    <td>{completedPicks[p.id] ? "✅ Completed" : "—"}</td>
                    <td>{pts}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button type="button" className="btn ghost" style={{ color: "var(--text-on-surface)", border: "2px solid var(--wood)" }} onClick={() => setPhase("points")}>
              ← Edit
            </button>
            <button className="btn primary" onClick={saveRound} disabled={saving}>
              {saving ? "Saving…" : "Save hand & continue"}
            </button>
          </div>
        </div>
      )}

      {rounds.length > 0 && phase === "phase" && (
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
