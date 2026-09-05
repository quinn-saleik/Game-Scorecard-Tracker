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
import TvMode from "../../../components/TvMode";
import { recomputeTotals } from "../../../data/rounds";

const TOTAL_POINTS = 12; // a hand is always 12 tricks/points, split between the two players
const MIN_MADE_POINTS = 7;
const SET_PENALTY = 7;

export default function TwoPlayerPlay() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [phase, setPhase] = useState("caller"); // caller | points | confirm
  const [callerId, setCallerId] = useState(null);
  const [callerPoints, setCallerPoints] = useState("");
  const [saving, setSaving] = useState(false);
  const [conflictNotice, setConflictNotice] = useState(null);
  // Set right before this device writes a round (save or undo) so the
  // reset effect below can tell "I just saved" apart from "someone else's
  // phone changed this game while I was mid-entry" — see that effect.
  const changedByThisDeviceRef = useRef(false);

  useEffect(() => subscribeToSession(sessionId, setSession), [sessionId]);

  // Reset the in-progress hand whenever one gets saved (or undone). This
  // game is shared in real time — if the other phone on this session saves
  // a hand while this device is still mid-entry for what it thought was
  // the current hand, that local progress is now stale and gets reset
  // here. That's the right outcome, but silently wiping a half-entered
  // hand with no explanation reads as a bug. Surface a brief notice
  // instead of resetting silently.
  useEffect(() => {
    const changedByThisDevice = changedByThisDeviceRef.current;
    changedByThisDeviceRef.current = false;
    const hadUnsavedProgress = callerId !== null;
    let timer;
    if (!changedByThisDevice && hadUnsavedProgress) {
      setConflictNotice("Someone already saved this hand from another device — moved you to the next one.");
      timer = setTimeout(() => setConflictNotice(null), 7000);
    }
    setPhase("caller");
    setCallerId(null);
    setCallerPoints("");
    return () => clearTimeout(timer);
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
  const caller = callerId ? session.players.find((p) => p.id === callerId) : null;
  const tvRows = session.players
    .slice()
    .sort((a, b) => (totals[b.id] || 0) - (totals[a.id] || 0))
    .map((p) => {
      let label = shortName(p);
      if (!pendingFinish && callerId === p.id) label += " · called trump";
      return {
        key: p.id,
        label,
        score: totals[p.id] || 0,
        isLeader: (totals[p.id] || 0) === leaderTotal && leaderTotal > 0,
        color: p.color,
        avatar: p.avatar,
        photo: p.photo,
      };
    });

  async function undoLastRound() {
    setSaving(true);
    changedByThisDeviceRef.current = true;
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

  const otherPlayer = caller ? session.players.find((p) => p.id !== caller.id) : null;
  // A hand always splits 12 points/tricks between the two players. The caller
  // is the only one at risk: they bank what they took if it's 7+, otherwise a
  // flat -7. The other player just banks the rest of the 12, no matter what
  // the caller scored or whether the caller made their minimum.
  const rawPoints = Math.max(0, Math.min(TOTAL_POINTS, Number(callerPoints) || 0));
  const callerMadeIt = rawPoints >= MIN_MADE_POINTS;
  const callerDelta = callerMadeIt ? rawPoints : -SET_PENALTY;
  const otherDelta = TOTAL_POINTS - rawPoints;

  async function saveRound() {
    setSaving(true);
    changedByThisDeviceRef.current = true;
    try {
      const scores = { [caller.id]: callerDelta };
      if (otherPlayer) scores[otherPlayer.id] = otherDelta;
      const newTotals = { ...totals };
      for (const [id, val] of Object.entries(scores)) {
        newTotals[id] = (newTotals[id] || 0) + val;
      }
      const newRound = {
        roundNumber: rounds.length + 1,
        dealerId: dealer.id,
        callerId: caller.id,
        callerPoints: rawPoints,
        made: callerMadeIt,
        scores,
      };
      await updateSession(sessionId, { rounds: [...rounds, newRound], totals: newTotals });
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
      {conflictNotice && <div className="warning-banner">{conflictNotice}</div>}

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
        <>
          {phase === "caller" && (
            <div className="card-surface">
              <h2>Who called trump this hand?</h2>
              <div className="chip-row">
                {session.players.map((p) => (
                  <span
                    key={p.id}
                    className="player-chip"
                    onClick={() => { setCallerId(p.id); setPhase("points"); }}
                  >
                    <PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />
                    {shortName(p)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {phase === "points" && caller && (
            <div className="card-surface">
              <h2>How many of the {TOTAL_POINTS} did <PlayerDot color={caller.color} avatar={caller.avatar} photo={caller.photo} />{shortName(caller)} take?</h2>
              <p style={{ color: "var(--muted)", fontSize: 13 }}>
                {shortName(caller)} called trump, so needs at least {MIN_MADE_POINTS} to make it —
                {" "}{MIN_MADE_POINTS}+ banks that many points, anything less is a flat -{SET_PENALTY}.{" "}
                {otherPlayer ? shortName(otherPlayer) : "The other player"} banks whatever's left of the{" "}
                {TOTAL_POINTS}, either way.
              </p>
              <div className="field">
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={TOTAL_POINTS}
                  placeholder="0"
                  value={callerPoints}
                  onChange={(e) => setCallerPoints(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="btn-row" style={{ marginTop: 12 }}>
                <button type="button" className="btn ghost" style={{ color: "var(--text-on-surface)", border: "2px solid var(--wood)" }} onClick={() => setPhase("caller")}>
                  ← Back
                </button>
                <button className="btn primary" onClick={() => setPhase("confirm")} disabled={callerPoints === ""}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {phase === "confirm" && caller && (
            <div className="card-surface">
              <h2>Confirm hand {rounds.length + 1}</h2>
              <table className="score-table">
                <thead><tr><th>Player</th><th>Result</th><th>Score</th></tr></thead>
                <tbody>
                  <tr>
                    <td><PlayerDot color={caller.color} avatar={caller.avatar} photo={caller.photo} />{shortName(caller)} (called trump)</td>
                    <td>{rawPoints} pts — {callerMadeIt ? "made it" : "didn't make it"}</td>
                    <td>{callerDelta >= 0 ? `+${callerDelta}` : callerDelta}</td>
                  </tr>
                  {otherPlayer && (
                    <tr>
                      <td><PlayerDot color={otherPlayer.color} avatar={otherPlayer.avatar} photo={otherPlayer.photo} />{shortName(otherPlayer)}</td>
                      <td>{otherDelta} pts</td>
                      <td>+{otherDelta}</td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="btn-row" style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="btn ghost"
                  style={{ color: "var(--text-on-surface)", border: "2px solid var(--wood)" }}
                  onClick={() => setPhase("points")}
                >
                  ← Edit
                </button>
                <button className="btn primary" onClick={saveRound} disabled={saving}>
                  {saving ? "Saving…" : "Save hand & continue"}
                </button>
              </div>
            </div>
          )}

          {rounds.length > 0 && phase === "caller" && (
            <div className="btn-row" style={{ marginBottom: 12 }}>
              <button type="button" className="btn ghost" style={{ color: "var(--text-on-surface)", border: "2px solid var(--wood)" }} onClick={undoLastRound} disabled={saving}>
                ← Undo last hand
              </button>
            </div>
          )}
        </>
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
