import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  subscribeToSession,
  completeSession,
} from "../../../data/gameSessions";
import PlayerDot from "../../../components/PlayerDot";
import { shortName } from "../../../data/playerNames";

export default function SecretHitlerPlay() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [winners, setWinners] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeToSession(sessionId, setSession), [sessionId]);

  if (!session) return <p className="empty-state">Loading game…</p>;

  if (session.status === "completed") {
    const winnerPlayers = session.players.filter((p) => session.winnerIds.includes(p.id));
    return (
      <div className="card-surface">
        <h2>Game already finished</h2>
        <p>Winning side: {winnerPlayers.map((p) => shortName(p)).join(", ")}</p>
        <button className="btn primary" onClick={() => navigate("/")}>Back to games</button>
      </div>
    );
  }

  function toggle(id) {
    setWinners((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function confirmFinish() {
    if (winners.length === 0) return;
    setSaving(true);
    try {
      const totals = Object.fromEntries(session.players.map((p) => [p.id, 0]));
      await completeSession(sessionId, { winnerIds: winners, totals });
      navigate(`/recap/${sessionId}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">
        <span className="suit black">🎭</span> Secret Hitler
      </h1>

      <div className="card-surface">
        <h2>Who was on the winning side?</h2>
        <p style={{ color: "var(--muted)", fontSize: 14, marginTop: -6 }}>
          Play the whole game as normal, then come back here and tap everyone who won — the
          Liberals if they hit their policy or Hitler-hunting win, or the Fascists (Hitler
          included) if they took over.
        </p>
        <div className="chip-row">
          {session.players.map((p) => (
            <span
              key={p.id}
              className={`player-chip ${winners.includes(p.id) ? "selected" : ""}`}
              onClick={() => toggle(p.id)}
            >
              <PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />
              {shortName(p)}
            </span>
          ))}
        </div>
        <div className="btn-row" style={{ marginTop: 16 }}>
          <button className="btn primary" onClick={confirmFinish} disabled={winners.length === 0 || saving}>
            {saving ? "Saving…" : "Finish game"}
          </button>
        </div>
        {winners.length === 0 && (
          <p className="empty-state">Tap at least one player to finish.</p>
        )}
      </div>
    </div>
  );
}
