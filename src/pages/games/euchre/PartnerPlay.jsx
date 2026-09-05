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

export default function PartnerPlay() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [phase, setPhase] = useState("bidTeam"); // bidTeam | bidPoints | othersPoints | confirm
  const [bidTeamIds, setBidTeamIds] = useState([]);
  const [bidPoints, setBidPoints] = useState("");
  const [othersPoints, setOthersPoints] = useState("");
  const [saving, setSaving] = useState(false);
  const [conflictNotice, setConflictNotice] = useState(null);
  // Set right before this device writes a round (save or undo) so the
  // reset effect below can tell "I just saved" apart from "someone else's
  // phone changed this game while I was mid-bid" — see that effect.
  const changedByThisDeviceRef = useRef(false);

  useEffect(() => subscribeToSession(sessionId, setSession), [sessionId]);

  // Reset the in-progress hand whenever one gets saved (or undone). This
  // game is shared in real time — if a second phone on the same session
  // saves a round while this device is still mid-bid for what it thought
  // was the current hand, that local progress is now stale and gets reset
  // here. That's the right outcome, but silently wiping someone's
  // half-entered bid with no explanation reads as a bug. Surface a brief
  // notice instead of resetting silently.
  useEffect(() => {
    const changedByThisDevice = changedByThisDeviceRef.current;
    changedByThisDeviceRef.current = false;
    const hadUnsavedProgress = phase !== "bidTeam" || bidTeamIds.length > 0;
    let timer;
    if (!changedByThisDevice && hadUnsavedProgress) {
      setConflictNotice("Someone already saved this hand from another device — moved you to the next one.");
      timer = setTimeout(() => setConflictNotice(null), 7000);
    }
    setPhase("bidTeam");
    setBidTeamIds([]);
    setBidPoints("");
    setOthersPoints("");
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

  const threshold = session.config?.winThreshold || 10;
  const totals = session.totals || {};
  const rounds = session.rounds || [];
  const leaderTotal = Math.max(0, ...Object.values(totals));
  const pendingFinish = leaderTotal >= threshold;
  const potentialWinners = session.players.filter(
    (p) => (totals[p.id] || 0) === leaderTotal && leaderTotal >= threshold
  );
  const tvRows = session.players
    .slice()
    .sort((a, b) => (totals[b.id] || 0) - (totals[a.id] || 0))
    .map((p) => ({
      key: p.id,
      label: shortName(p),
      score: totals[p.id] || 0,
      isLeader: (totals[p.id] || 0) === leaderTotal && leaderTotal > 0,
      color: p.color,
      avatar: p.avatar,
      photo: p.photo,
    }));

  function toggleBidPlayer(id) {
    setBidTeamIds((s) => {
      if (s.includes(id)) return s.filter((x) => x !== id);
      if (s.length >= 2) return s;
      return [...s, id];
    });
  }

  async function undoLastRound() {
    setSaving(true);
    changedByThisDeviceRef.current = true;
    try {
      const last = rounds[rounds.length - 1];
      const newTotals = { ...totals };
      for (const p of session.players) {
        newTotals[p.id] = (newTotals[p.id] || 0) - (last.deltas?.[p.id] || 0);
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
      const newTotals = recomputeTotals("euchre-partner", session, newRounds);
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

  const bidVal = Number(bidPoints) || 0;
  const othersVal = Number(othersPoints) || 0;
  const bidTeamPlayers = session.players.filter((p) => bidTeamIds.includes(p.id));
  const othersPlayers = session.players.filter((p) => !bidTeamIds.includes(p.id));

  async function saveRound() {
    setSaving(true);
    changedByThisDeviceRef.current = true;
    try {
      const deltas = {};
      const newTotals = { ...totals };
      for (const p of session.players) {
        const delta = bidTeamIds.includes(p.id) ? bidVal : othersVal;
        deltas[p.id] = delta;
        newTotals[p.id] = (newTotals[p.id] || 0) + delta;
      }
      const newRound = { roundNumber: rounds.length + 1, bidTeamIds, bidPoints: bidVal, othersPoints: othersVal, deltas };
      await updateSession(sessionId, { rounds: [...rounds, newRound], totals: newTotals });
    } finally {
      setSaving(false);
    }
  }

  const scoreTable = (
    <div className="card-surface">
      <h2>Scores (first to {threshold})</h2>
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
  );

  const roundHistory = (
    <RoundHistory
      session={session}
      rounds={rounds}
      gameType="euchre-partner"
      unitLabel="Hand"
      onDelete={deleteRound}
      busy={saving}
    />
  );

  if (pendingFinish) {
    return (
      <div>
        <h1 className="page-title" style={{ justifyContent: "space-between" }}>
          <span><span className="suit black">🤝</span> Euchre (pick your partner) — Hand {rounds.length + 1}</span>
          <TvMode gameName="Euchre (pick your partner)" icon="🤝" statusLine={`Hand ${rounds.length + 1} · first to ${threshold}`} rows={tvRows} />
        </h1>
        {conflictNotice && <div className="warning-banner">{conflictNotice}</div>}
        {scoreTable}
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
        {roundHistory}
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title"><span className="suit black">🤝</span> Euchre (pick your partner) — Hand {rounds.length + 1}</h1>
      {conflictNotice && <div className="warning-banner">{conflictNotice}</div>}
      {scoreTable}

      {phase === "bidTeam" && (
        <div className="card-surface">
          <h2>Who's on the bid team? ({bidTeamIds.length}/2)</h2>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>Tap 1 player if they went alone, or 2 for a called partner.</p>
          <div className="chip-row">
            {session.players.map((p) => (
              <span
                key={p.id}
                className={`player-chip ${bidTeamIds.includes(p.id) ? "selected" : ""}`}
                onClick={() => toggleBidPlayer(p.id)}
              >
                <PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />
                {shortName(p)}
              </span>
            ))}
          </div>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button
              className="btn primary"
              disabled={bidTeamIds.length === 0}
              onClick={() => setPhase("bidPoints")}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {phase === "bidPoints" && (
        <div className="card-surface">
          <h2>Points for <TeamList players={bidTeamPlayers} />?</h2>
          <div className="field">
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                className="input"
                type="number"
                placeholder="0"
                value={bidPoints}
                onChange={(e) => setBidPoints(e.target.value)}
              />
              <VoiceInputButton onResult={(v) => setBidPoints(v)} />
            </div>
          </div>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button type="button" className="btn ghost" style={{ color: "var(--text-on-surface)", border: "2px solid var(--wood)" }} onClick={() => setPhase("bidTeam")}>
              ← Back
            </button>
            <button className="btn primary" onClick={() => setPhase("othersPoints")}>
              Continue
            </button>
          </div>
        </div>
      )}

      {phase === "othersPoints" && (
        <div className="card-surface">
          <h2>Points for everyone else (<TeamList players={othersPlayers} />)?</h2>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>Same value applied to all of them.</p>
          <div className="field">
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                className="input"
                type="number"
                placeholder="0"
                value={othersPoints}
                onChange={(e) => setOthersPoints(e.target.value)}
              />
              <VoiceInputButton onResult={(v) => setOthersPoints(v)} />
            </div>
          </div>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button type="button" className="btn ghost" style={{ color: "var(--text-on-surface)", border: "2px solid var(--wood)" }} onClick={() => setPhase("bidPoints")}>
              ← Back
            </button>
            <button className="btn primary" onClick={() => setPhase("confirm")}>
              Continue
            </button>
          </div>
        </div>
      )}

      {phase === "confirm" && (
        <div className="card-surface">
          <h2>Confirm hand {rounds.length + 1}</h2>
          <table className="score-table">
            <thead><tr><th>Player</th><th>Score</th></tr></thead>
            <tbody>
              {session.players.map((p) => {
                const delta = bidTeamIds.includes(p.id) ? bidVal : othersVal;
                return (
                  <tr key={p.id}>
                    <td><PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />{shortName(p)}{bidTeamIds.includes(p.id) ? " (bid team)" : ""}</td>
                    <td>{delta >= 0 ? `+${delta}` : delta}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button type="button" className="btn ghost" style={{ color: "var(--text-on-surface)", border: "2px solid var(--wood)" }} onClick={() => setPhase("othersPoints")}>
              ← Edit
            </button>
            <button className="btn primary" onClick={saveRound} disabled={saving}>
              {saving ? "Saving…" : "Save hand & continue"}
            </button>
          </div>
        </div>
      )}

      {rounds.length > 0 && phase === "bidTeam" && (
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

function TeamList({ players }) {
  return players.map((p, i) => (
    <span key={p.id}>
      {i > 0 && " & "}
      <PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />{shortName(p)}
    </span>
  ));
}
