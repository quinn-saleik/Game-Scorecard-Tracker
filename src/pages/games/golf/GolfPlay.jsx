import { useEffect, useRef, useState } from "react";
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

export default function GolfPlay() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [phase, setPhase] = useState("playing"); // playing | confirm
  const [inputs, setInputs] = useState({});
  const [saving, setSaving] = useState(false);
  const [conflictNotice, setConflictNotice] = useState(null);
  // Set right before this device writes a hole (save or undo) so the
  // reset effect below can tell "I just saved" apart from "someone else's
  // phone changed this game while I had scores typed in" — see that effect.
  const changedByThisDeviceRef = useRef(false);

  useEffect(() => subscribeToSession(sessionId, setSession), [sessionId]);

  // Whenever the saved round count changes (a hole was just written, or
  // undone), figure out whether more holes remain or the game is over.
  // This game is shared in real time — if a second phone on the same
  // session saves a hole while this device still has scores typed in for
  // what it thought was the current hole, that local progress is now
  // stale and gets cleared here. That's the right outcome, but silently
  // wiping someone's half-entered scores with no explanation reads as a
  // bug. Surface a brief notice instead of resetting silently.
  useEffect(() => {
    if (!session) return;
    const holes = session.config?.holes || 9;
    const changedByThisDevice = changedByThisDeviceRef.current;
    changedByThisDeviceRef.current = false;
    const hadUnsavedProgress = Object.keys(inputs).length > 0;
    let timer;
    if (!changedByThisDevice && hadUnsavedProgress) {
      setConflictNotice("Someone already saved this hole from another device — moved you to the next one.");
      timer = setTimeout(() => setConflictNotice(null), 7000);
    }
    if (session.rounds.length >= holes) {
      setPhase("confirm");
    } else {
      setPhase("playing");
      setInputs({});
    }
    return () => clearTimeout(timer);
  }, [session?.rounds?.length]);

  if (!session) {
    return <p className="empty-state">Loading game…</p>;
  }

  if (session.status === "completed") {
    return (
      <div className="card-surface">
        <h2>Game already finished</h2>
        <p>Winner: {session.players.filter((p) => session.winnerIds.includes(p.id)).map((p) => shortName(p)).join(", ")}</p>
        <button className="btn primary" onClick={() => navigate("/")}>Back to games</button>
      </div>
    );
  }

  const holes = session.config?.holes || 9;
  const totals = session.totals || {};
  const rounds = session.rounds || [];
  const minTotal = Math.min(...session.players.map((p) => totals[p.id] || 0));
  const tvRows = session.players
    .slice()
    .sort((a, b) => (totals[a.id] || 0) - (totals[b.id] || 0))
    .map((p) => ({
      key: p.id,
      label: shortName(p),
      score: totals[p.id] || 0,
      isLeader: (totals[p.id] || 0) === minTotal,
      color: p.color,
      avatar: p.avatar,
      photo: p.photo,
    }));

  async function undoLastRound() {
    setSaving(true);
    changedByThisDeviceRef.current = true;
    try {
      const last = rounds[rounds.length - 1];
      const newTotals = { ...totals };
      for (const p of session.players) {
        newTotals[p.id] = (newTotals[p.id] || 0) - (last.scores[p.id] || 0);
      }
      await updateSession(sessionId, {
        rounds: rounds.slice(0, -1),
        totals: newTotals,
      });
    } finally {
      setSaving(false);
    }
  }

  async function deleteRound(index) {
    setSaving(true);
    try {
      const newRounds = rounds.filter((_, i) => i !== index);
      const newTotals = recomputeTotals("golf", session, newRounds);
      await updateSession(sessionId, { rounds: newRounds, totals: newTotals });
    } finally {
      setSaving(false);
    }
  }

  // --- Confirm / game-over screen -----------------------------------
  if (phase === "confirm") {
    const winners = session.players.filter((p) => (totals[p.id] || 0) === minTotal);

    async function confirmFinish() {
      setSaving(true);
      try {
        await completeSession(sessionId, {
          winnerIds: winners.map((p) => p.id),
          totals,
        });
        navigate(`/recap/${sessionId}`);
      } finally {
        setSaving(false);
      }
    }

    return (
      <div>
        <h1 className="page-title" style={{ justifyContent: "space-between" }}>
          <span><span className="suit black">⛳</span> Golf — Final hole complete</span>
          <TvMode gameName="Golf" icon="⛳" statusLine="Final hole complete · lowest wins" rows={tvRows} />
        </h1>
        {conflictNotice && <div className="warning-banner">{conflictNotice}</div>}
        <div className="card-surface">
          <h2>🏆 {winners.map((p) => shortName(p)).join(" & ")} wins!</h2>
          <table className="score-table">
            <thead>
              <tr><th>Player</th><th>Total</th></tr>
            </thead>
            <tbody>
              {session.players
                .slice()
                .sort((a, b) => (totals[a.id] || 0) - (totals[b.id] || 0))
                .map((p) => (
                  <tr key={p.id}>
                    <td><PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />{shortName(p)}</td>
                    <td className={(totals[p.id] || 0) === minTotal ? "leader" : ""}>{totals[p.id] || 0}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          <p>Double-check the last hole before locking it in.</p>
          <div className="btn-row">
            <button className="btn ghost" style={{ color: "var(--text-on-surface)", border: "2px solid var(--wood)" }} onClick={undoLastRound} disabled={saving}>
              ← Undo last hole
            </button>
            <button className="btn primary" onClick={confirmFinish} disabled={saving}>
              Confirm winner & finish
            </button>
          </div>
        </div>
        <RoundHistory
          session={session}
          rounds={rounds}
          gameType="golf"
          unitLabel="Hole"
          onDelete={deleteRound}
          busy={saving}
        />
      </div>
    );
  }

  // --- In-progress hole ------------------------------------------------
  async function submitRound(e) {
    e.preventDefault();
    setSaving(true);
    changedByThisDeviceRef.current = true;
    try {
      const roundScores = {};
      const newTotals = { ...totals };
      for (const p of session.players) {
        const val = Number(inputs[p.id]) || 0;
        roundScores[p.id] = val;
        newTotals[p.id] = (newTotals[p.id] || 0) + val;
      }
      const newRound = { roundNumber: rounds.length + 1, scores: roundScores };
      await updateSession(sessionId, {
        rounds: [...rounds, newRound],
        totals: newTotals,
      });
      setInputs({});
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="page-title" style={{ justifyContent: "space-between" }}>
        <span><span className="suit black">⛳</span> Golf — Hole {rounds.length + 1} of {holes}</span>
        <TvMode gameName="Golf" icon="⛳" statusLine={`Hole ${rounds.length + 1} of ${holes} · lowest wins`} rows={tvRows} />
      </h1>
      {conflictNotice && <div className="warning-banner">{conflictNotice}</div>}

      <div className="card-surface">
        <h2>Standings</h2>
        <table className="score-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {session.players
              .slice()
              .sort((a, b) => (totals[a.id] || 0) - (totals[b.id] || 0))
              .map((p) => (
                <tr key={p.id}>
                  <td><PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />{shortName(p)}</td>
                  <td className={(totals[p.id] || 0) === minTotal ? "leader" : ""}>
                    {totals[p.id] || 0}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="card-surface">
        <h2>Add hole {rounds.length + 1} scores</h2>
        <form onSubmit={submitRound}>
          {session.players.map((p) => (
            <div className="field" key={p.id}>
              <label htmlFor={`pt-${p.id}`}><PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />{shortName(p)}</label>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  id={`pt-${p.id}`}
                  className="input"
                  type="number"
                  placeholder="0"
                  value={inputs[p.id] ?? ""}
                  onChange={(e) =>
                    setInputs((prev) => ({ ...prev, [p.id]: e.target.value }))
                  }
                />
                <VoiceInputButton
                  onResult={(v) => setInputs((prev) => ({ ...prev, [p.id]: v }))}
                />
              </div>
            </div>
          ))}
          <div className="btn-row">
            {rounds.length > 0 && (
              <button
                type="button"
                className="btn ghost"
                style={{ color: "var(--text-on-surface)", border: "2px solid var(--wood)" }}
                onClick={undoLastRound}
                disabled={saving}
              >
                ← Undo last hole
              </button>
            )}
            <button className="btn primary" type="submit" disabled={saving}>
              Save hole
            </button>
          </div>
        </form>
      </div>

      <RoundHistory
        session={session}
        rounds={rounds}
        gameType="golf"
        unitLabel="Hole"
        onDelete={deleteRound}
        busy={saving}
      />
    </div>
  );
}
