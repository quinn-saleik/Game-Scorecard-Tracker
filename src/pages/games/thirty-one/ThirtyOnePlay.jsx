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

export default function ThirtyOnePlay() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [lostIds, setLostIds] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeToSession(sessionId, setSession), [sessionId]);

  // Reset the in-progress round selection whenever one gets saved (or undone).
  useEffect(() => {
    setLostIds([]);
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
  const alivePlayers = session.players.filter((p) => (totals[p.id] ?? 0) > 0);
  const outPlayers = session.players.filter((p) => (totals[p.id] ?? 0) <= 0);
  const pendingFinish = alivePlayers.length <= 1;
  const maxLives = Math.max(0, ...Object.values(totals));
  const potentialWinners = alivePlayers.length > 0
    ? alivePlayers
    : session.players.filter((p) => (totals[p.id] ?? 0) === maxLives);

  function toggleLost(id) {
    setLostIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function saveRound() {
    setSaving(true);
    try {
      const newTotals = { ...totals };
      for (const id of lostIds) newTotals[id] = (newTotals[id] ?? 0) - 1;
      const newRound = { roundNumber: rounds.length + 1, lostLifeIds: lostIds };
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
      for (const id of last.lostLifeIds || []) newTotals[id] = (newTotals[id] ?? 0) + 1;
      await updateSession(sessionId, { rounds: rounds.slice(0, -1), totals: newTotals });
    } finally {
      setSaving(false);
    }
  }

  async function deleteRound(index) {
    setSaving(true);
    try {
      const newRounds = rounds.filter((_, i) => i !== index);
      const newTotals = recomputeTotals("thirty-one", session, newRounds);
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

  const scoreTable = (
    <div className="card-surface">
      <h2>Lives remaining</h2>
      <table className="score-table">
        <thead><tr><th>Player</th><th>Lives</th></tr></thead>
        <tbody>
          {session.players
            .slice()
            .sort((a, b) => (totals[b.id] ?? 0) - (totals[a.id] ?? 0))
            .map((p) => {
              const lives = totals[p.id] ?? 0;
              const out = lives <= 0;
              return (
                <tr key={p.id}>
                  <td style={out ? { opacity: 0.5 } : undefined}>
                    <PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />{p.name}{out ? " — out" : ""}
                  </td>
                  <td className={!out && lives === maxLives ? "leader" : ""}>{"❤️".repeat(Math.max(0, lives)) || "—"}</td>
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
      gameType="thirty-one"
      unitLabel="Round"
      onDelete={deleteRound}
      busy={saving}
    />
  );

  if (pendingFinish) {
    return (
      <div>
        <h1 className="page-title"><span className="suit red">🂱</span> 31 — Round {rounds.length + 1}</h1>
        {scoreTable}
        <div className="card-surface">
          <h2>🏆 {potentialWinners.map((p) => p.name).join(" & ")} {potentialWinners.length > 1 ? "are" : "is"} last standing!</h2>
          <p>Double-check the last round before locking it in.</p>
          <div className="btn-row">
            {rounds.length > 0 && (
              <button className="btn ghost" style={{ color: "var(--text-on-surface)", border: "2px solid #6b4226" }} onClick={undoLastRound} disabled={saving}>
                ← Undo last round
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
      <h1 className="page-title"><span className="suit red">🂱</span> 31 — Round {rounds.length + 1}</h1>
      {scoreTable}

      <div className="card-surface">
        <h2>Who lost a life this round?</h2>
        <p style={{ color: "var(--muted)", fontSize: 13 }}>Tap everyone who didn't beat the knock — leave nobody selected if it was a wash.</p>
        <div className="chip-row">
          {alivePlayers.map((p) => (
            <span
              key={p.id}
              className={`player-chip ${lostIds.includes(p.id) ? "selected" : ""}`}
              onClick={() => toggleLost(p.id)}
            >
              <PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />
              {p.name}
            </span>
          ))}
        </div>
        {outPlayers.length > 0 && (
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 10 }}>
            Out: {outPlayers.map((p) => p.name).join(", ")}
          </p>
        )}
        <div className="btn-row" style={{ marginTop: 14 }}>
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
          <button className="btn primary" onClick={saveRound} disabled={saving}>
            {saving ? "Saving…" : "Save round"}
          </button>
        </div>
      </div>

      {roundHistory}
    </div>
  );
}
