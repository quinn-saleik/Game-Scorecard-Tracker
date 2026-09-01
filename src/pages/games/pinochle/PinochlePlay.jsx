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
import ScorePresets from "../../../components/ScorePresets";
import VoiceInputButton from "../../../components/VoiceInputButton";
import { recomputeTotals } from "../../../data/rounds";

function TeamNames({ players }) {
  return players.map((p, i) => (
    <span key={p.id}>
      {i > 0 && " & "}
      <PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />{shortName(p)}
    </span>
  ));
}

export default function PinochlePlay() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [phase, setPhase] = useState("bid"); // bid | outcome | entry
  const [biddingTeam, setBiddingTeam] = useState(null); // "A" | "B"
  const [bidAmount, setBidAmount] = useState("");
  const [pointsBidding, setPointsBidding] = useState("");
  const [pointsOther, setPointsOther] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeToSession(sessionId, setSession), [sessionId]);

  // Reset the in-progress hand whenever one gets saved (or undone).
  useEffect(() => {
    setPhase("bid");
    setBiddingTeam(null);
    setBidAmount("");
    setPointsBidding("");
    setPointsOther("");
  }, [session?.rounds?.length]);

  if (!session) return <p className="empty-state">Loading game…</p>;

  if (session.status === "completed") {
    const winners = session.players.filter((p) => session.winnerIds.includes(p.id));
    return (
      <div className="card-surface">
        <h2>Game already finished</h2>
        <p>Winning team: {winners.map((p) => shortName(p)).join(" & ")}</p>
        <button className="btn primary" onClick={() => navigate("/")}>Back to games</button>
      </div>
    );
  }

  const targetScore = session.config?.targetScore || 500;
  const teamAIds = session.config?.teamA || [];
  const teamBIds = session.config?.teamB || [];
  const totals = session.totals || {};
  const rounds = session.rounds || [];
  const teamAPlayers = session.players.filter((p) => teamAIds.includes(p.id));
  const teamBPlayers = session.players.filter((p) => teamBIds.includes(p.id));
  const teamATotal = totals[teamAIds[0]] || 0;
  const teamBTotal = totals[teamBIds[0]] || 0;
  const pendingFinish = teamATotal >= targetScore || teamBTotal >= targetScore;

  // Real Pinochle rule: if both teams cross the target on the very same hand,
  // the team that won the bid on that hand takes the game outright — even if
  // the other team's total ended up higher.
  const lastRound = rounds[rounds.length - 1];
  const bothOverTarget = teamATotal >= targetScore && teamBTotal >= targetScore;
  const aWins = bothOverTarget && lastRound
    ? lastRound.biddingTeam === "A"
    : teamATotal >= targetScore;
  const winningTeamPlayers = aWins ? teamAPlayers : teamBPlayers;

  async function saveHand(round) {
    setSaving(true);
    try {
      const newTotals = { ...totals };
      for (const id of teamAIds) newTotals[id] = (newTotals[id] || 0) + round.teamAPoints;
      for (const id of teamBIds) newTotals[id] = (newTotals[id] || 0) + round.teamBPoints;
      await updateSession(sessionId, { rounds: [...rounds, round], totals: newTotals });
    } finally {
      setSaving(false);
    }
  }

  async function undoLastRound() {
    setSaving(true);
    try {
      const last = rounds[rounds.length - 1];
      const newTotals = { ...totals };
      for (const id of teamAIds) newTotals[id] = (newTotals[id] || 0) - (last.teamAPoints || 0);
      for (const id of teamBIds) newTotals[id] = (newTotals[id] || 0) - (last.teamBPoints || 0);
      await updateSession(sessionId, { rounds: rounds.slice(0, -1), totals: newTotals });
    } finally {
      setSaving(false);
    }
  }

  async function deleteRound(index) {
    setSaving(true);
    try {
      const newRounds = rounds.filter((_, i) => i !== index);
      const newTotals = recomputeTotals("pinochle", session, newRounds);
      await updateSession(sessionId, { rounds: newRounds, totals: newTotals });
    } finally {
      setSaving(false);
    }
  }

  async function confirmFinish() {
    setSaving(true);
    try {
      await completeSession(sessionId, { winnerIds: winningTeamPlayers.map((p) => p.id), totals });
      navigate(`/recap/${sessionId}`);
    } finally {
      setSaving(false);
    }
  }

  const scoreTable = (
    <div className="card-surface">
      <h2>Scores (first to {targetScore})</h2>
      <table className="score-table">
        <thead><tr><th>Team</th><th>Total</th></tr></thead>
        <tbody>
          <tr>
            <td><TeamNames players={teamAPlayers} /></td>
            <td className={teamATotal >= teamBTotal && teamATotal > 0 ? "leader" : ""}>{teamATotal}</td>
          </tr>
          <tr>
            <td><TeamNames players={teamBPlayers} /></td>
            <td className={teamBTotal >= teamATotal && teamBTotal > 0 ? "leader" : ""}>{teamBTotal}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const roundHistory = (
    <RoundHistory
      session={session}
      rounds={rounds}
      gameType="pinochle"
      unitLabel="Hand"
      onDelete={deleteRound}
      busy={saving}
    />
  );

  if (pendingFinish) {
    return (
      <div>
        <h1 className="page-title">🂮 Pinochle — Hand {rounds.length + 1}</h1>
        {scoreTable}
        <div className="card-surface">
          <h2>🏆 {winningTeamPlayers.map((p) => shortName(p)).join(" & ")} reached {targetScore}!</h2>
          {bothOverTarget && (
            <p style={{ color: "var(--muted)" }}>
              Both teams crossed {targetScore} on that hand — by the standard
              Pinochle rule, the team that won the bid takes the game.
            </p>
          )}
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
        {roundHistory}
      </div>
    );
  }

  const biddingTeamPlayers = biddingTeam === "A" ? teamAPlayers : teamBPlayers;
  const otherTeamPlayers = biddingTeam === "A" ? teamBPlayers : teamAPlayers;
  const bidNum = Number(bidAmount) || 0;

  function deltasFor({ wentSet, bidding, other }) {
    const biddingPts = wentSet ? -bidNum : bidding;
    const otherPts = wentSet ? 0 : other;
    return biddingTeam === "A"
      ? { teamAPoints: biddingPts, teamBPoints: otherPts }
      : { teamAPoints: otherPts, teamBPoints: biddingPts };
  }

  async function saveSetRound() {
    const { teamAPoints, teamBPoints } = deltasFor({ wentSet: true });
    await saveHand({
      roundNumber: rounds.length + 1,
      biddingTeam,
      bid: bidNum,
      wentSet: true,
      teamAPoints,
      teamBPoints,
    });
  }

  async function saveMadeRound() {
    const { teamAPoints, teamBPoints } = deltasFor({
      wentSet: false,
      bidding: Number(pointsBidding) || 0,
      other: Number(pointsOther) || 0,
    });
    await saveHand({
      roundNumber: rounds.length + 1,
      biddingTeam,
      bid: bidNum,
      wentSet: false,
      teamAPoints,
      teamBPoints,
    });
  }

  const undoButton = rounds.length > 0 && phase === "bid" && (
    <div className="btn-row" style={{ marginBottom: 12 }}>
      <button className="btn ghost" style={{ color: "var(--text-on-surface)", border: "2px solid #6b4226" }} onClick={undoLastRound} disabled={saving}>
        ← Undo last hand
      </button>
    </div>
  );

  return (
    <div>
      <h1 className="page-title">🂮 Pinochle — Hand {rounds.length + 1}</h1>
      {scoreTable}
      {undoButton}

      {phase === "bid" && (
        <div className="card-surface">
          <h2>Who won the bid, and for how much?</h2>
          <div className="chip-row">
            <span
              className={`player-chip ${biddingTeam === "A" ? "selected" : ""}`}
              onClick={() => setBiddingTeam("A")}
            >
              <TeamNames players={teamAPlayers} />
            </span>
            <span
              className={`player-chip ${biddingTeam === "B" ? "selected" : ""}`}
              onClick={() => setBiddingTeam("B")}
            >
              <TeamNames players={teamBPlayers} />
            </span>
          </div>
          <div className="field">
            <label htmlFor="bidAmount">Bid amount</label>
            <input
              id="bidAmount"
              className="input"
              type="number"
              min="0"
              placeholder="usually 50+"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
            />
          </div>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button
              className="btn primary"
              disabled={!biddingTeam || bidNum <= 0}
              onClick={() => setPhase("outcome")}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {phase === "outcome" && (
        <div className="card-surface">
          <h2>Did <TeamNames players={biddingTeamPlayers} /> make their bid of {bidNum}?</h2>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button className="btn primary" onClick={() => setPhase("entry")} disabled={saving}>
              ✓ Made it
            </button>
            <button className="btn danger" onClick={saveSetRound} disabled={saving}>
              {saving ? "Saving…" : "✗ Went set"}
            </button>
          </div>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn ghost"
              style={{ color: "var(--text-on-surface)", border: "2px solid #6b4226" }}
              onClick={() => setPhase("bid")}
            >
              ← Edit bid
            </button>
          </div>
        </div>
      )}

      {phase === "entry" && (
        <div className="card-surface">
          <h2>Enter each team's meld + trick points</h2>
          <div className="field">
            <label htmlFor="pointsBidding"><TeamNames players={biddingTeamPlayers} /> (bid {bidNum})</label>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                id="pointsBidding"
                className="input"
                type="number"
                placeholder="0"
                value={pointsBidding}
                onChange={(e) => setPointsBidding(e.target.value)}
              />
              <VoiceInputButton onResult={(v) => setPointsBidding(v)} />
            </div>
            <ScorePresets values={[10, 20, 50]} onPick={(v) => setPointsBidding(String(v))} />
          </div>
          <div className="field">
            <label htmlFor="pointsOther"><TeamNames players={otherTeamPlayers} /></label>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                id="pointsOther"
                className="input"
                type="number"
                placeholder="0"
                value={pointsOther}
                onChange={(e) => setPointsOther(e.target.value)}
              />
              <VoiceInputButton onResult={(v) => setPointsOther(v)} />
            </div>
            <ScorePresets values={[10, 20, 50]} onPick={(v) => setPointsOther(String(v))} />
          </div>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn ghost"
              style={{ color: "var(--text-on-surface)", border: "2px solid #6b4226" }}
              onClick={() => setPhase("outcome")}
            >
              ← Back
            </button>
            <button className="btn primary" onClick={saveMadeRound} disabled={saving}>
              {saving ? "Saving…" : "Save hand & continue"}
            </button>
          </div>
        </div>
      )}

      {roundHistory}
    </div>
  );
}
