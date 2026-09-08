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

const NO_PARTNER = "none"; // sentinel: bidder went alone

// Bidder calls one of the 4 suits, or a one-time-per-game "no trump" call
// (high card wins every trick, or low card wins every trick). Once a
// player has called either Hi-No or Lo-No once, they can't call either
// again for the rest of THIS game — calling suit trump is unlimited, only
// the no-trump calls are one-shot. Tracked per player, derived from the
// rounds already played (see noTrumpUsedIds below) rather than a separate
// stored flag, so undoing/deleting a hand automatically un-burns it.
const TRUMP_OPTIONS = [
  { key: "♠", label: "Spades", suitColor: "black" },
  { key: "♥", label: "Hearts", suitColor: "red" },
  { key: "♦", label: "Diamonds", suitColor: "red" },
  { key: "♣", label: "Clubs", suitColor: "black" },
  { key: "hi-no", label: "Hi-No" },
  { key: "lo-no", label: "Lo-No" },
];
const NO_TRUMP_KEYS = new Set(["hi-no", "lo-no"]);

function trumpDisplay(key) {
  if (!key) return null;
  const opt = TRUMP_OPTIONS.find((o) => o.key === key);
  return opt ? opt.label : key;
}

export default function PartnerPlay() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [phase, setPhase] = useState("bidder"); // bidder | trump | bid | tricks | partner | others | confirm
  const [bidderId, setBidderId] = useState(null);
  const [trump, setTrump] = useState(null);
  const [bid, setBid] = useState("");
  const [tricks, setTricks] = useState("");
  const [partnerId, setPartnerId] = useState(null); // player id, NO_PARTNER, or null (not chosen yet)
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
    const hadUnsavedProgress = phase !== "bidder" || bidderId !== null;
    let timer;
    if (!changedByThisDevice && hadUnsavedProgress) {
      setConflictNotice("Someone already saved this hand from another device — moved you to the next one.");
      timer = setTimeout(() => setConflictNotice(null), 7000);
    }
    setPhase("bidder");
    setBidderId(null);
    setTrump(null);
    setBid("");
    setTricks("");
    setPartnerId(null);
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
  // Whoever has already called Hi-No or Lo-No once this game can't call
  // either again — derived fresh from the saved hands every render so an
  // undone/deleted hand automatically un-burns it.
  const noTrumpUsedIds = new Set(
    rounds.filter((r) => NO_TRUMP_KEYS.has(r.trump)).map((r) => r.bidderId)
  );
  const tvRows = session.players
    .slice()
    .sort((a, b) => (totals[b.id] || 0) - (totals[a.id] || 0))
    .map((p) => {
      let label = shortName(p);
      if (!pendingFinish && bidderId === p.id && trump) label += ` · ${trumpDisplay(trump)}`;
      if (noTrumpUsedIds.has(p.id)) label += " 🌀";
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

  const bidder = bidderId ? session.players.find((p) => p.id === bidderId) : null;
  const partner =
    partnerId && partnerId !== NO_PARTNER ? session.players.find((p) => p.id === partnerId) : null;
  const partnerOptions = bidderId ? session.players.filter((p) => p.id !== bidderId) : [];
  const othersPlayers = session.players.filter(
    (p) => p.id !== bidderId && p.id !== (partner ? partner.id : null)
  );

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

  // Whoever bids the most names trump. Making the bid (or beating it) scores
  // the tricks actually taken; falling short goes negative by the bid amount
  // instead. A called partner shares that exact result; everyone else just
  // gets one shared "how many did everyone else get?" entry.
  const bidVal = Number(bid) || 0;
  const tricksVal = Number(tricks) || 0;
  const bidderMadeIt = tricksVal >= bidVal;
  const bidderDelta = bidderMadeIt ? tricksVal : -bidVal;
  const othersVal = Number(othersPoints) || 0;

  function choosePartner(id) {
    setPartnerId(id);
    const chosenPartnerId = id !== NO_PARTNER ? id : null;
    const remaining = session.players.filter((p) => p.id !== bidderId && p.id !== chosenPartnerId);
    setPhase(remaining.length > 0 ? "others" : "confirm");
  }

  async function saveRound() {
    setSaving(true);
    changedByThisDeviceRef.current = true;
    try {
      const deltas = {};
      const newTotals = { ...totals };
      for (const p of session.players) {
        const delta =
          p.id === bidderId ? bidderDelta : partner && p.id === partner.id ? bidderDelta : othersVal;
        deltas[p.id] = delta;
        newTotals[p.id] = (newTotals[p.id] || 0) + delta;
      }
      const newRound = {
        roundNumber: rounds.length + 1,
        bidderId,
        trump,
        bid: bidVal,
        tricks: tricksVal,
        partnerId: partner ? partner.id : null,
        othersPoints: othersVal,
        deltas,
      };
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
              <td>
                <PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />{shortName(p)}
                {noTrumpUsedIds.has(p.id) && (
                  <span title="Already used their one Hi-No/Lo-No call this game"> 🌀</span>
                )}
              </td>
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
      <h1 className="page-title" style={{ justifyContent: "space-between" }}>
        <span><span className="suit black">🤝</span> Euchre (pick your partner) — Hand {rounds.length + 1}</span>
        <TvMode
          gameName="Euchre (pick your partner)"
          icon="🤝"
          statusLine={`Hand ${rounds.length + 1} · first to ${threshold}${trump ? ` · ${trumpDisplay(trump)}` : ""}`}
          rows={tvRows}
        />
      </h1>
      {conflictNotice && <div className="warning-banner">{conflictNotice}</div>}
      {scoreTable}

      {phase === "bidder" && (
        <div className="card-surface">
          <h2>Who bid the most?</h2>
          <div className="chip-row">
            {session.players.map((p) => (
              <span
                key={p.id}
                className="player-chip"
                onClick={() => { setBidderId(p.id); setPhase("trump"); }}
              >
                <PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />
                {shortName(p)}
                {noTrumpUsedIds.has(p.id) && " 🌀"}
              </span>
            ))}
          </div>
          {noTrumpUsedIds.size > 0 && (
            <p style={{ color: "var(--muted)", fontSize: 13 }}>🌀 = already used their one Hi-No/Lo-No call this game</p>
          )}
        </div>
      )}

      {phase === "trump" && bidder && (
        <div className="card-surface">
          <h2>What did <PlayerDot color={bidder.color} avatar={bidder.avatar} photo={bidder.photo} />{shortName(bidder)} call?</h2>
          {noTrumpUsedIds.has(bidderId) && (
            <p style={{ color: "var(--muted)", fontSize: 13 }}>
              {shortName(bidder)} already used their one Hi-No/Lo-No call this game — suits only.
            </p>
          )}
          <div className="chip-row">
            {TRUMP_OPTIONS.map((opt) => {
              const disabled = NO_TRUMP_KEYS.has(opt.key) && noTrumpUsedIds.has(bidderId);
              return (
                <span
                  key={opt.key}
                  className="player-chip"
                  onClick={() => { if (!disabled) { setTrump(opt.key); setPhase("bid"); } }}
                  style={disabled ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
                  title={disabled ? "Already used this game" : undefined}
                >
                  {opt.suitColor ? <span className={`suit ${opt.suitColor}`}>{opt.key}</span> : "🌀"} {opt.label}
                </span>
              );
            })}
          </div>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button type="button" className="btn ghost" style={{ color: "var(--text-on-surface)", border: "2px solid var(--wood)" }} onClick={() => setPhase("bidder")}>
              ← Back
            </button>
          </div>
        </div>
      )}

      {phase === "bid" && bidder && (
        <div className="card-surface">
          <h2>How much did <PlayerDot color={bidder.color} avatar={bidder.avatar} photo={bidder.photo} />{shortName(bidder)} bid?</h2>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>Trump: {trumpDisplay(trump)}</p>
          <div className="field">
            <input
              className="input"
              type="number"
              min="0"
              placeholder="0"
              value={bid}
              onChange={(e) => setBid(e.target.value)}
              autoFocus
            />
          </div>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button type="button" className="btn ghost" style={{ color: "var(--text-on-surface)", border: "2px solid var(--wood)" }} onClick={() => setPhase("trump")}>
              ← Back
            </button>
            <button className="btn primary" onClick={() => setPhase("tricks")} disabled={bid === ""}>
              Continue
            </button>
          </div>
        </div>
      )}

      {phase === "tricks" && bidder && (
        <div className="card-surface">
          <h2>How many tricks did <PlayerDot color={bidder.color} avatar={bidder.avatar} photo={bidder.photo} />{shortName(bidder)} actually get?</h2>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>
            {bid}+ scores that many tricks; short of {bid} scores -{bidVal} instead.
          </p>
          <div className="field">
            <input
              className="input"
              type="number"
              min="0"
              placeholder="0"
              value={tricks}
              onChange={(e) => setTricks(e.target.value)}
              autoFocus
            />
          </div>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button type="button" className="btn ghost" style={{ color: "var(--text-on-surface)", border: "2px solid var(--wood)" }} onClick={() => setPhase("bid")}>
              ← Back
            </button>
            <button className="btn primary" onClick={() => setPhase("partner")} disabled={tricks === ""}>
              Continue
            </button>
          </div>
        </div>
      )}

      {phase === "partner" && bidder && (
        <div className="card-surface">
          <h2>Who was <PlayerDot color={bidder.color} avatar={bidder.avatar} photo={bidder.photo} />{shortName(bidder)}'s partner?</h2>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>The partner gets the same score as {shortName(bidder)}.</p>
          <div className="chip-row">
            <span className="player-chip" onClick={() => choosePartner(NO_PARTNER)}>
              🃏 Went alone (no partner)
            </span>
            {partnerOptions.map((p) => (
              <span key={p.id} className="player-chip" onClick={() => choosePartner(p.id)}>
                <PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />
                {shortName(p)}
              </span>
            ))}
          </div>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button type="button" className="btn ghost" style={{ color: "var(--text-on-surface)", border: "2px solid var(--wood)" }} onClick={() => setPhase("tricks")}>
              ← Back
            </button>
          </div>
        </div>
      )}

      {phase === "others" && bidder && (
        <div className="card-surface">
          <h2>How many did everyone else get?</h2>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>
            Same value applied to <TeamList players={othersPlayers} />.
          </p>
          <div className="field">
            <input
              className="input"
              type="number"
              placeholder="0"
              value={othersPoints}
              onChange={(e) => setOthersPoints(e.target.value)}
              autoFocus
            />
          </div>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button type="button" className="btn ghost" style={{ color: "var(--text-on-surface)", border: "2px solid var(--wood)" }} onClick={() => setPhase("partner")}>
              ← Back
            </button>
            <button className="btn primary" onClick={() => setPhase("confirm")}>
              Continue
            </button>
          </div>
        </div>
      )}

      {phase === "confirm" && bidder && (
        <div className="card-surface">
          <h2>Confirm hand {rounds.length + 1}</h2>
          <table className="score-table">
            <thead><tr><th>Player</th><th>Result</th><th>Score</th></tr></thead>
            <tbody>
              <tr>
                <td><PlayerDot color={bidder.color} avatar={bidder.avatar} photo={bidder.photo} />{shortName(bidder)} (bid {bidVal}, {trumpDisplay(trump)})</td>
                <td>{tricksVal} tricks — {bidderMadeIt ? "made it" : "didn't make it"}</td>
                <td>{bidderDelta >= 0 ? `+${bidderDelta}` : bidderDelta}</td>
              </tr>
              {partner && (
                <tr>
                  <td><PlayerDot color={partner.color} avatar={partner.avatar} photo={partner.photo} />{shortName(partner)} (partner)</td>
                  <td>—</td>
                  <td>{bidderDelta >= 0 ? `+${bidderDelta}` : bidderDelta}</td>
                </tr>
              )}
              {othersPlayers.map((p) => (
                <tr key={p.id}>
                  <td><PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />{shortName(p)}</td>
                  <td>—</td>
                  <td>{othersVal >= 0 ? `+${othersVal}` : othersVal}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn ghost"
              style={{ color: "var(--text-on-surface)", border: "2px solid var(--wood)" }}
              onClick={() => setPhase(othersPlayers.length > 0 ? "others" : "partner")}
            >
              ← Edit
            </button>
            <button className="btn primary" onClick={saveRound} disabled={saving}>
              {saving ? "Saving…" : "Save hand & continue"}
            </button>
          </div>
        </div>
      )}

      {rounds.length > 0 && phase === "bidder" && (
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
