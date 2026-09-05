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

const DEAL_SIZE = 15;
const TRUMP_SUITS = [
  { key: "♠", label: "Spades", color: "black" },
  { key: "♥", label: "Hearts", color: "red" },
  { key: "♦", label: "Diamonds", color: "red" },
  { key: "♣", label: "Clubs", color: "black" },
];

function TeamNames({ players }) {
  return players.map((p, i) => (
    <span key={p.id}>
      {i > 0 && " & "}
      <PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />{shortName(p)}
    </span>
  ));
}

function NumberPicker({ max, onSelect }) {
  const options = Array.from({ length: max + 1 }, (_, i) => i);
  return (
    <div className="chip-row">
      {options.map((n) => (
        <button key={n} type="button" className="btn small" onClick={() => onSelect(n)}>
          {n}
        </button>
      ))}
    </div>
  );
}

export default function Euchre15Play() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [phase, setPhase] = useState("trump"); // trump | bidWinner | bidAmount | tricks | confirm
  const [trump, setTrump] = useState(null);
  const [bidWinner, setBidWinner] = useState(null); // "A" | "B"
  const [bidAmount, setBidAmount] = useState(null);
  const [bidWinnerTricks, setBidWinnerTricks] = useState(null);
  const [saving, setSaving] = useState(false);
  const [conflictNotice, setConflictNotice] = useState(null);
  // Set right before this device writes a round (save or undo) so the
  // reset effect below can tell "I just saved" apart from "someone else's
  // phone changed this game while I was mid-bid" — see that effect.
  const changedByThisDeviceRef = useRef(false);

  useEffect(() => subscribeToSession(sessionId, setSession), [sessionId]);

  // Reset the in-progress hand whenever one gets saved (or undone). This
  // game is shared in real time — if a second phone on the same session
  // saves a hand while this device is still mid-entry for what it thought
  // was the current hand, that local progress is now stale and gets reset
  // here. That's the right outcome (the hand really did move on), but
  // silently wiping half-entered progress with no explanation reads as a
  // bug ("it timed out and went back to bids"). Surface a brief notice
  // instead of resetting silently.
  useEffect(() => {
    const changedByThisDevice = changedByThisDeviceRef.current;
    changedByThisDeviceRef.current = false;
    const hadUnsavedProgress = phase !== "trump" || trump !== null;
    let timer;
    if (!changedByThisDevice && hadUnsavedProgress) {
      setConflictNotice("Someone already saved this hand from another device — moved you to the next one.");
      timer = setTimeout(() => setConflictNotice(null), 7000);
    }
    setPhase("trump");
    setTrump(null);
    setBidWinner(null);
    setBidAmount(null);
    setBidWinnerTricks(null);
    return () => clearTimeout(timer);
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

  const threshold = session.config?.winThreshold || 50;
  const teamAIds = session.config?.teamA || [];
  const teamBIds = session.config?.teamB || [];
  const totals = session.totals || {};
  const rounds = session.rounds || [];
  const teamAPlayers = session.players.filter((p) => teamAIds.includes(p.id));
  const teamBPlayers = session.players.filter((p) => teamBIds.includes(p.id));
  const teamATotal = totals[teamAIds[0]] || 0;
  const teamBTotal = totals[teamBIds[0]] || 0;
  const pendingFinish = teamATotal >= threshold || teamBTotal >= threshold;
  const aWins = teamATotal >= threshold && teamATotal >= teamBTotal;
  const winningTeamPlayers = aWins ? teamAPlayers : teamBPlayers;
  const tvRows = [
    { key: "A", label: teamAPlayers.map((p) => shortName(p)).join(" & "), score: teamATotal, isLeader: teamATotal >= teamBTotal && teamATotal > 0 },
    { key: "B", label: teamBPlayers.map((p) => shortName(p)).join(" & "), score: teamBTotal, isLeader: teamBTotal >= teamATotal && teamBTotal > 0 },
  ].sort((a, b) => b.score - a.score);

  async function undoLastRound() {
    setSaving(true);
    changedByThisDeviceRef.current = true;
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
      const newTotals = recomputeTotals("euchre-15card", session, newRounds);
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
      <h2>Scores (first to {threshold})</h2>
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
      gameType="euchre-15card"
      unitLabel="Hand"
      onDelete={deleteRound}
      busy={saving}
    />
  );

  if (pendingFinish) {
    return (
      <div>
        <h1 className="page-title" style={{ justifyContent: "space-between" }}>
          <span><span className="suit black">🃏</span> Euchre (15-card) — Hand {rounds.length + 1}</span>
          <TvMode gameName="Euchre (15-card)" icon="🃏" statusLine={`Hand ${rounds.length + 1} · first to ${threshold}`} rows={tvRows} />
        </h1>
        {conflictNotice && <div className="warning-banner">{conflictNotice}</div>}
        {scoreTable}
        <div className="card-surface">
          <h2>🏆 {winningTeamPlayers.map((p) => shortName(p)).join(" & ")} reached {threshold}!</h2>
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

  const bidWinnerPlayers = bidWinner === "A" ? teamAPlayers : bidWinner === "B" ? teamBPlayers : [];
  const otherPlayers = bidWinner === "A" ? teamBPlayers : bidWinner === "B" ? teamAPlayers : [];
  const otherTricks = bidWinnerTricks === null ? null : DEAL_SIZE - bidWinnerTricks;
  // Only the team that won the bid risks going negative — they score their
  // actual tricks if they made their bid, or lose exactly their bid amount
  // if they didn't. The other team just banks whatever tricks they took,
  // no risk either way (per Quinn: "who won the bid ... then they go
  // negative that amount if they don't make it" — the non-bidding side was
  // never at risk under this house rule).
  const bidWinnerDelta =
    bidWinnerTricks === null ? 0 : bidWinnerTricks >= bidAmount ? bidWinnerTricks : -bidAmount;
  const otherDelta = otherTricks === null ? 0 : otherTricks;
  const deltaA = bidWinner === "A" ? bidWinnerDelta : otherDelta;
  const deltaB = bidWinner === "B" ? bidWinnerDelta : otherDelta;

  async function saveRound() {
    setSaving(true);
    changedByThisDeviceRef.current = true;
    try {
      const newTotals = { ...totals };
      for (const id of teamAIds) newTotals[id] = (newTotals[id] || 0) + deltaA;
      for (const id of teamBIds) newTotals[id] = (newTotals[id] || 0) + deltaB;
      const newRound = {
        roundNumber: rounds.length + 1,
        trump,
        bidWinner,
        bid: bidAmount,
        bidWinnerTricks,
        otherTricks,
        teamAPoints: deltaA,
        teamBPoints: deltaB,
      };
      await updateSession(sessionId, { rounds: [...rounds, newRound], totals: newTotals });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="page-title" style={{ justifyContent: "space-between" }}>
        <span><span className="suit black">🃏</span> Euchre (15-card) — Hand {rounds.length + 1}</span>
        <TvMode gameName="Euchre (15-card)" icon="🃏" statusLine={`Hand ${rounds.length + 1} · first to ${threshold}`} rows={tvRows} />
      </h1>
      {conflictNotice && <div className="warning-banner">{conflictNotice}</div>}
      {scoreTable}

      {phase === "trump" && (
        <div className="card-surface">
          <h2>What's trump this hand?</h2>
          <div className="chip-row">
            {TRUMP_SUITS.map((s) => (
              <button
                key={s.key}
                type="button"
                className="btn small"
                onClick={() => {
                  setTrump(s.key);
                  setPhase("bidWinner");
                }}
              >
                <span className={`suit ${s.color}`}>{s.key}</span> {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === "bidWinner" && (
        <div className="card-surface">
          <p>Trump: <span className={`suit ${TRUMP_SUITS.find((s) => s.key === trump)?.color}`}>{trump}</span></p>
          <h2>Which team won the bid?</h2>
          <div className="btn-row">
            <button className="btn primary" style={{ flex: 1 }} onClick={() => { setBidWinner("A"); setPhase("bidAmount"); }}>
              <TeamNames players={teamAPlayers} />
            </button>
            <button className="btn primary" style={{ flex: 1 }} onClick={() => { setBidWinner("B"); setPhase("bidAmount"); }}>
              <TeamNames players={teamBPlayers} />
            </button>
          </div>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button type="button" className="btn ghost" style={{ color: "var(--text-on-surface)", border: "2px solid var(--wood)" }} onClick={() => setPhase("trump")}>
              ← Back
            </button>
          </div>
        </div>
      )}

      {phase === "bidAmount" && (
        <div className="card-surface">
          <h2>How many tricks did <TeamNames players={bidWinnerPlayers} /> bid?</h2>
          <NumberPicker
            max={DEAL_SIZE}
            onSelect={(n) => {
              setBidAmount(n);
              setPhase("tricks");
            }}
          />
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button type="button" className="btn ghost" style={{ color: "var(--text-on-surface)", border: "2px solid var(--wood)" }} onClick={() => setPhase("bidWinner")}>
              ← Back
            </button>
          </div>
        </div>
      )}

      {phase === "tricks" && (
        <div className="card-surface">
          <p><TeamNames players={bidWinnerPlayers} /> bid {bidAmount} with trump {trump}.</p>
          <h2>How many tricks did <TeamNames players={bidWinnerPlayers} /> actually win?</h2>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>
            <TeamNames players={otherPlayers} /> gets the rest of the {DEAL_SIZE} — only the bid
            team risks going negative.
          </p>
          <NumberPicker
            max={DEAL_SIZE}
            onSelect={(n) => {
              setBidWinnerTricks(n);
              setPhase("confirm");
            }}
          />
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button type="button" className="btn ghost" style={{ color: "var(--text-on-surface)", border: "2px solid var(--wood)" }} onClick={() => setPhase("bidAmount")}>
              ← Back
            </button>
          </div>
        </div>
      )}

      {phase === "confirm" && (
        <div className="card-surface">
          <h2>Confirm hand {rounds.length + 1}</h2>
          <p>Trump: <span className={`suit ${TRUMP_SUITS.find((s) => s.key === trump)?.color}`}>{trump}</span></p>
          <table className="score-table">
            <thead><tr><th>Team</th><th>Bid</th><th>Tricks</th><th>Score</th></tr></thead>
            <tbody>
              <tr>
                <td><TeamNames players={bidWinnerPlayers} /> (bid)</td>
                <td>{bidAmount}</td>
                <td>{bidWinnerTricks}</td>
                <td>{bidWinnerDelta >= 0 ? `+${bidWinnerDelta}` : bidWinnerDelta}</td>
              </tr>
              <tr>
                <td><TeamNames players={otherPlayers} /></td>
                <td>—</td>
                <td>{otherTricks}</td>
                <td>+{otherDelta}</td>
              </tr>
            </tbody>
          </table>
          {bidWinnerTricks < bidAmount && (
            <div className="warning-banner">
              ⚠️ Didn't make the bid — <TeamNames players={bidWinnerPlayers} /> goes {bidWinnerDelta} instead of scoring tricks won.
            </div>
          )}
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button type="button" className="btn ghost" style={{ color: "var(--text-on-surface)", border: "2px solid var(--wood)" }} onClick={() => setPhase("tricks")}>
              ← Edit tricks
            </button>
            <button className="btn primary" onClick={saveRound} disabled={saving}>
              {saving ? "Saving…" : "Save hand & continue"}
            </button>
          </div>
        </div>
      )}

      {rounds.length > 0 && phase === "trump" && (
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
