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

export default function OtherPlay() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [inputs, setInputs] = useState({});
  const [bidInputs, setBidInputs] = useState({});
  const [finishing, setFinishing] = useState(false);
  const [selectedWinners, setSelectedWinners] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showRules, setShowRules] = useState(false);

  useEffect(() => subscribeToSession(sessionId, setSession), [sessionId]);

  if (!session) {
    return <p className="empty-state">Loading game…</p>;
  }

  const gameName = session.config?.customName || session.gameLabel || "Other";
  const icon = session.config?.icon || "🃏";
  const direction = session.config?.scoreDirection === "down" ? "down" : "up";
  const targetScore = typeof session.config?.targetScore === "number" ? session.config.targetScore : null;
  const bidding = Boolean(session.config?.bidding);
  const houseRules = (session.config?.houseRules || "").trim();

  if (session.status === "completed") {
    const winners = session.players.filter((p) => session.winnerIds.includes(p.id));
    return (
      <div className="card-surface">
        <h2>{gameName} already finished</h2>
        <p>Winner: {winners.map((p) => shortName(p)).join(", ")}</p>
        <button className="btn primary" onClick={() => navigate("/")}>Back to games</button>
      </div>
    );
  }

  const totals = session.totals || {};
  const rounds = session.rounds || [];

  // "Leader" highlighting respects this game's configured direction —
  // lowest total wins for a count-down game, highest for count-up — and
  // stays off entirely while everyone's still tied (usually just the
  // start of the game), rather than the old "0 doesn't count" special case
  // that only made sense for count-up games.
  const totalValues = session.players.map((p) => totals[p.id] || 0);
  const allTied = totalValues.every((v) => v === totalValues[0]);
  const leaderTotal = allTied ? null : direction === "down" ? Math.min(...totalValues) : Math.max(...totalValues);

  // Players who've crossed the configured winning score, if any — purely
  // informational (see the banner below); nothing here ends the game
  // automatically.
  const reachedPlayers =
    targetScore == null
      ? []
      : session.players.filter((p) =>
          direction === "down" ? (totals[p.id] || 0) <= targetScore : (totals[p.id] || 0) >= targetScore
        );

  const tvRows = session.players
    .slice()
    .sort((a, b) => (direction === "down" ? (totals[a.id] || 0) - (totals[b.id] || 0) : (totals[b.id] || 0) - (totals[a.id] || 0)))
    .map((p) => ({
      key: p.id,
      label: shortName(p),
      score: totals[p.id] || 0,
      isLeader: (totals[p.id] || 0) === leaderTotal && leaderTotal != null,
      color: p.color,
      avatar: p.avatar,
      photo: p.photo,
    }));

  async function submitRound(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const roundScores = {};
      const roundBids = {};
      const newTotals = { ...totals };
      for (const p of session.players) {
        const val = Number(inputs[p.id]) || 0;
        roundScores[p.id] = val;
        newTotals[p.id] = (newTotals[p.id] || 0) + val;
        if (bidding) roundBids[p.id] = Number(bidInputs[p.id]) || 0;
      }
      const newRound = { roundNumber: rounds.length + 1, scores: roundScores };
      if (bidding) newRound.bids = roundBids;
      await updateSession(sessionId, { rounds: [...rounds, newRound], totals: newTotals });
      setInputs({});
      setBidInputs({});
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
    // Default-check whoever hit the winning score, or otherwise whoever's
    // currently leading — still fully adjustable, since for some "Other"
    // games the number on the board doesn't decide the winner.
    const preselect = reachedPlayers.length > 0 ? reachedPlayers : session.players.filter((p) => (totals[p.id] || 0) === leaderTotal && leaderTotal != null);
    setSelectedWinners(preselect.map((p) => p.id));
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
        <h1 className="page-title"><span className="suit black">{icon}</span> {gameName} — Finish game</h1>
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
                {shortName(p)} ({totals[p.id] || 0})
              </span>
            ))}
          </div>
          <div className="btn-row" style={{ marginTop: 14 }}>
            <button
              type="button"
              className="btn ghost"
              style={{ color: "var(--text-on-surface)", border: "2px solid var(--wood)" }}
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
      <h1 className="page-title" style={{ justifyContent: "space-between" }}>
        <span><span className="suit black">{icon}</span> {gameName} — Round {rounds.length + 1}</span>
        <TvMode gameName={gameName} icon={icon} statusLine={`Round ${rounds.length + 1}${direction === "down" ? " · lowest wins" : ""}`} rows={tvRows} />
      </h1>

      {houseRules && (
        <div className="card-surface" style={{ paddingTop: 14, paddingBottom: showRules ? 20 : 14 }}>
          <button
            type="button"
            onClick={() => setShowRules((o) => !o)}
            aria-expanded={showRules}
            style={{
              display: "flex", alignItems: "center", gap: 8, width: "100%",
              background: "none", border: "none", cursor: "pointer", padding: 0,
              fontSize: 15, fontWeight: 700, color: "var(--heading-on-surface)",
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>ⓘ</span>
            {showRules ? "Hide house rules" : "House rules"}
          </button>
          {showRules && (
            <p style={{ margin: "12px 0 0", color: "var(--muted)", fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
              {houseRules}
            </p>
          )}
        </div>
      )}

      {reachedPlayers.length > 0 && (
        <div className="warning-banner">
          🎯 {reachedPlayers.map((p) => shortName(p)).join(" & ")} reached the winning score
          ({targetScore}).{" "}
          <button
            type="button"
            className="btn primary small"
            style={{ marginLeft: 8 }}
            onClick={openFinish}
          >
            Finish game
          </button>
        </div>
      )}

      <div className="card-surface">
        <h2>Scores{direction === "down" ? " (lowest wins)" : ""}</h2>
        <table className="score-table">
          <thead><tr><th>Player</th><th>Total</th></tr></thead>
          <tbody>
            {session.players.map((p) => (
              <tr key={p.id}>
                <td><PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />{shortName(p)}</td>
                <td className={(totals[p.id] || 0) === leaderTotal && leaderTotal != null ? "leader" : ""}>
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
              <label htmlFor={`pt-${p.id}`}><PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />{shortName(p)}</label>
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
                {bidding && (
                  <input
                    aria-label={`${p.name} bid`}
                    className="input"
                    type="number"
                    placeholder="Bid"
                    style={{ maxWidth: 90 }}
                    value={bidInputs[p.id] ?? ""}
                    onChange={(e) => setBidInputs((prev) => ({ ...prev, [p.id]: e.target.value }))}
                  />
                )}
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
        showBids={bidding}
      />
    </div>
  );
}
