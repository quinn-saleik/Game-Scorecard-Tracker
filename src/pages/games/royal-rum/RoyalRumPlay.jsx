import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  subscribeToSession,
  updateSession,
  completeSession,
} from "../../../data/gameSessions";
import PlayerDot from "../../../components/PlayerDot";
import RoundHistory from "../../../components/RoundHistory";
import VoiceInputButton from "../../../components/VoiceInputButton";
import { recomputeTotals } from "../../../data/rounds";

const GOALS = [6, 7, 8, 9, 10, 11, 12];

function completedGoalsFor(playerId, rounds) {
  const set = new Set();
  for (const round of rounds) {
    const g = round.goals?.[playerId];
    if (g) set.add(g);
  }
  return set;
}

export default function RoyalRumPlay() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [phase, setPhase] = useState("goals"); // goals | scores | confirm
  const [goalPicks, setGoalPicks] = useState({}); // playerId -> goal number
  const [pointsInput, setPointsInput] = useState({}); // playerId -> string
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeToSession(sessionId, setSession), [sessionId]);

  // Reset the in-progress hand whenever one gets saved (or undone).
  useEffect(() => {
    setPhase("goals");
    setGoalPicks({});
    setPointsInput({});
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

  const checklists = Object.fromEntries(
    session.players.map((p) => [p.id, completedGoalsFor(p.id, rounds)])
  );
  const finishers = session.players.filter((p) => checklists[p.id].size === GOALS.length);
  const pendingFinish = finishers.length > 0;
  const lowestAmongFinishers = pendingFinish
    ? Math.min(...finishers.map((p) => totals[p.id] ?? 0))
    : null;
  const potentialWinners = pendingFinish
    ? finishers.filter((p) => (totals[p.id] ?? 0) === lowestAmongFinishers)
    : [];

  const lowestTotal = Math.min(0, ...Object.values(totals));

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
      const newTotals = recomputeTotals("royal-rum", session, newRounds);
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
        goals: goalPicks,
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
            <th>Goals (6–12)</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {session.players.map((p) => {
            const done = checklists[p.id];
            return (
              <tr key={p.id}>
                <td><PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />{p.name}</td>
                <td style={{ fontSize: 13, letterSpacing: 1 }}>
                  {GOALS.map((g) => (
                    <span key={g} style={{ opacity: done.has(g) ? 1 : 0.3, marginRight: 4 }}>
                      {done.has(g) ? "✅" : g}
                    </span>
                  ))}
                </td>
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
      gameType="royal-rum"
      unitLabel="Hand"
      onDelete={deleteRound}
      busy={saving}
    />
  );

  if (pendingFinish) {
    return (
      <div>
        <h1 className="page-title"><span className="suit black">♦</span> Royal Rum — Hand {rounds.length + 1}</h1>
        {scoreTable}
        <div className="card-surface">
          <h2>🏆 {potentialWinners.map((p) => p.name).join(" & ")} checked off all 7 with the lowest score!</h2>
          <p>Double-check the last hand before locking it in.</p>
          <div className="btn-row">
            {rounds.length > 0 && (
              <button className="btn ghost" style={{ color: "var(--text-on-surface)", border: "2px solid #6b4226" }} onClick={undoLastRound} disabled={saving}>
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
      <h1 className="page-title"><span className="suit black">♦</span> Royal Rum — Hand {rounds.length + 1}</h1>
      {scoreTable}

      {phase === "goals" && (
        <div className="card-surface">
          <h2>What did anyone get this hand?</h2>
          {session.players.map((p) => {
            const remaining = GOALS.filter((g) => !checklists[p.id].has(g));
            return (
              <div key={p.id} style={{ marginBottom: 14 }}>
                <p style={{ margin: "0 0 6px", fontWeight: 600 }}>
                  <PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />{p.name}
                </p>
                <div className="chip-row">
                  <span
                    className={`player-chip ${!goalPicks[p.id] ? "selected" : ""}`}
                    onClick={() => setGoalPicks((prev) => ({ ...prev, [p.id]: null }))}
                  >
                    ✗ None
                  </span>
                  {remaining.map((g) => (
                    <span
                      key={g}
                      className={`player-chip ${goalPicks[p.id] === g ? "selected" : ""}`}
                      onClick={() => setGoalPicks((prev) => ({ ...prev, [p.id]: g }))}
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
          <div className="btn-row">
            <button className="btn primary" onClick={() => setPhase("scores")}>Continue</button>
          </div>
        </div>
      )}

      {phase === "scores" && (
        <div className="card-surface">
          <h2>Leftover points</h2>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>
            Everyone enters their points for this hand — checking off a goal doesn't zero it out,
            it just checks off the goal. Missing a goal usually means a lot more points.
          </p>
          {session.players.map((p) => (
            <div className="field" key={p.id}>
              <label htmlFor={`pts-${p.id}`}>
                <PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />{p.name}
                {goalPicks[p.id] ? ` — checked off ${goalPicks[p.id]}` : ""}
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
            <button type="button" className="btn ghost" style={{ color: "var(--text-on-surface)", border: "2px solid #6b4226" }} onClick={() => setPhase("goals")}>
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
            <thead><tr><th>Player</th><th>Goal</th><th>Points</th></tr></thead>
            <tbody>
              {session.players.map((p) => {
                const g = goalPicks[p.id];
                const pts = Number(pointsInput[p.id]) || 0;
                return (
                  <tr key={p.id}>
                    <td><PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />{p.name}</td>
                    <td>{g ? `✅ ${g}` : "—"}</td>
                    <td>{pts}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button type="button" className="btn ghost" style={{ color: "var(--text-on-surface)", border: "2px solid #6b4226" }} onClick={() => setPhase("scores")}>
              ← Edit
            </button>
            <button className="btn primary" onClick={saveRound} disabled={saving}>
              {saving ? "Saving…" : "Save hand & continue"}
            </button>
          </div>
        </div>
      )}

      {rounds.length > 0 && phase === "goals" && (
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
