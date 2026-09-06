import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  subscribeToSession,
  updateSession,
  completeSession,
} from "../../../data/gameSessions";
import {
  getDealerIndex,
  getBidOrder,
  getBidLabel,
  getForbiddenBid,
} from "./ohHeckLogic";
import PlayerDot from "../../../components/PlayerDot";
import { shortName } from "../../../data/playerNames";
import RoundHistory from "../../../components/RoundHistory";
import TvMode from "../../../components/TvMode";
import { recomputeTotals } from "../../../data/rounds";

// In-progress bidding/scoring for the CURRENT round lives on the session
// document itself (session.live), not in this component's local state.
// It used to be local-only, which meant only the phone actively entering
// bids ever saw them — every other device's TV mode just sat blank because
// nothing about "who's bid what so far" was ever written anywhere they
// could read it. Writing it straight to Firestore as each bid/score is
// entered means every device subscribed to the session — TV mode included
// — sees the same live progress, not just the one phone doing the tapping.
const DEFAULT_LIVE = { phase: "bidding", biddingIdx: 0, bids: {}, scoringIdx: 0, results: {} };

function NumberPicker({ max, disabledValue, onSelect }) {
  const options = Array.from({ length: max + 1 }, (_, i) => i);
  return (
    <div className="chip-row">
      {options.map((n) => (
        <button
          key={n}
          type="button"
          className="btn small"
          disabled={n === disabledValue}
          onClick={() => onSelect(n)}
          title={n === disabledValue ? "Not allowed — would make bids exactly match cards dealt" : undefined}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

export default function OhHeckPlay() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeToSession(sessionId, setSession), [sessionId]);

  if (!session) {
    return <p className="empty-state">Loading game…</p>;
  }

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

  const roundSequence = session.config?.roundSequence || [];
  const roundIndex = session.rounds.length;
  const rounds = session.rounds || [];
  const totals = session.totals || {};
  const currentMax = Math.max(0, ...Object.values(totals));
  const allRoundsDone = roundIndex >= roundSequence.length;

  // Live, shared-across-devices progress for the round in play.
  const live = session.live || DEFAULT_LIVE;
  const phase = allRoundsDone ? "confirm" : live.phase || "bidding";
  const biddingIdx = live.biddingIdx || 0;
  const bids = live.bids || {};
  const scoringIdx = live.scoringIdx || 0;
  const results = live.results || {};

  async function updateLive(patch) {
    await updateSession(sessionId, { live: { ...live, ...patch } });
  }

  const cardsThisRound = roundSequence[roundIndex];
  const dealerIndex = getDealerIndex(roundIndex, session.players.length);
  const dealer = session.players[dealerIndex];
  const bidOrder = getBidOrder(session.players, dealerIndex);
  const bidRule = session.config?.bidRule || "traditional";
  const currentBidderId = phase === "bidding" ? bidOrder[biddingIdx]?.id : null;

  const tvRows = session.players
    .slice()
    .sort((a, b) => (totals[b.id] || 0) - (totals[a.id] || 0))
    .map((p) => {
      let label = shortName(p);
      if (phase === "bidding") {
        if (bids[p.id] !== undefined) label += ` · bid ${bids[p.id]}`;
        else if (p.id === currentBidderId) label += " · bidding…";
      } else if ((phase === "scoring" || phase === "declare") && results[p.id] === undefined && bids[p.id] !== undefined) {
        label += ` · bid ${bids[p.id]}`;
      } else if (phase === "scoring" && results[p.id] !== undefined) {
        label += ` · got ${results[p.id].tricksWon}`;
      }
      return {
        key: p.id,
        label,
        score: totals[p.id] || 0,
        isLeader: (totals[p.id] || 0) === currentMax && currentMax > 0,
        color: p.color,
        avatar: p.avatar,
        photo: p.photo,
      };
    });

  async function undoLastRound() {
    setSaving(true);
    try {
      const last = rounds[rounds.length - 1];
      const newTotals = { ...totals };
      for (const p of session.players) {
        newTotals[p.id] = (newTotals[p.id] || 0) - (last.results[p.id]?.score || 0);
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
      const newTotals = recomputeTotals("oh-heck", session, newRounds);
      await updateSession(sessionId, { rounds: newRounds, totals: newTotals });
    } finally {
      setSaving(false);
    }
  }

  // --- Confirm / game-over screen -----------------------------------
  if (phase === "confirm") {
    const maxTotal = Math.max(...Object.values(totals));
    const winners = session.players.filter((p) => (totals[p.id] || 0) === maxTotal);

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
          <span><span className="suit black">🂡</span> Oh Heck! — Final round complete</span>
          <TvMode gameName="Oh Heck!" icon="🂡" statusLine="Final round complete" rows={tvRows} />
        </h1>
        <div className="card-surface">
          <h2>🏆 {winners.map((p) => shortName(p)).join(" & ")}</h2>
          <table className="score-table">
            <thead>
              <tr><th>Player</th><th>Total</th></tr>
            </thead>
            <tbody>
              {session.players
                .slice()
                .sort((a, b) => (totals[b.id] || 0) - (totals[a.id] || 0))
                .map((p) => (
                  <tr key={p.id}>
                    <td><PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />{shortName(p)}</td>
                    <td className={(totals[p.id] || 0) === maxTotal ? "leader" : ""}>{totals[p.id] || 0}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          <p>Double-check the last round before locking it in.</p>
          <div className="btn-row">
            <button className="btn ghost" style={{ color: "var(--text-on-surface)", border: "2px solid var(--wood)" }} onClick={undoLastRound} disabled={saving}>
              ← Undo last round
            </button>
            <button className="btn primary" onClick={confirmFinish} disabled={saving}>
              Confirm winner & finish
            </button>
          </div>
        </div>
        <RoundHistory
          session={session}
          rounds={rounds}
          gameType="oh-heck"
          unitLabel="Round"
          onDelete={deleteRound}
          busy={saving}
        />
      </div>
    );
  }

  // --- In-progress round setup ---------------------------------------
  const statusLine =
    phase === "bidding" && bidOrder[biddingIdx]
      ? `Round ${roundIndex + 1} of ${roundSequence.length} · ${shortName(bidOrder[biddingIdx])} is bidding`
      : `Round ${roundIndex + 1} of ${roundSequence.length}`;

  const header = (
    <h1 className="page-title" style={{ justifyContent: "space-between" }}>
      <span><span className="suit black">🂡</span> Oh Heck! — Round {roundIndex + 1} of {roundSequence.length} ({cardsThisRound} cards)</span>
      <TvMode gameName="Oh Heck!" icon="🂡" statusLine={statusLine} rows={tvRows} />
    </h1>
  );

  const undoButton = rounds.length > 0 && (
    <div className="btn-row" style={{ marginBottom: 12 }}>
      <button className="btn ghost" style={{ color: "var(--cream)" }} onClick={undoLastRound} disabled={saving}>
        ← Undo last round
      </button>
    </div>
  );

  const scoreTable = (
    <div className="card-surface">
      <h2>Running totals</h2>
      <table className="score-table">
        <thead><tr><th>Player</th><th>Total</th></tr></thead>
        <tbody>
          {session.players.map((p) => (
            <tr key={p.id}>
              <td><PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />{shortName(p)}{p.id === dealer.id ? " 🃏" : ""}</td>
              <td>{totals[p.id] || 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ color: "var(--muted)", fontSize: 13 }}>🃏 = dealer this round</p>
    </div>
  );

  // --- Bidding phase ----------------------------------------------
  if (phase === "bidding") {
    const currentBidder = bidOrder[biddingIdx];
    const isLastBidder = biddingIdx === bidOrder.length - 1;
    const bidsSoFar = Object.values(bids).reduce((a, b) => a + b, 0);
    const forbidden =
      isLastBidder && bidRule === "traditional"
        ? getForbiddenBid(cardsThisRound, bidsSoFar)
        : null;

    return (
      <div>
        {header}
        {undoButton}
        <div className="card-surface">
          <h2>Bidding — <PlayerDot color={currentBidder.color} avatar={currentBidder.avatar} photo={currentBidder.photo} />{shortName(currentBidder)}{currentBidder.id === dealer.id ? " (dealer)" : ""}</h2>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: -4 }}>
            Bid order (left of the dealer goes first, dealer bids last):
          </p>
          <div className="chip-row" style={{ marginBottom: 10 }}>
            {bidOrder.map((p) => {
              const bidValue = bids[p.id];
              const isCurrent = p.id === currentBidder.id;
              return (
                <span
                  key={p.id}
                  className={`player-chip ${isCurrent ? "selected" : ""}`}
                  style={bidValue === undefined && !isCurrent ? { opacity: 0.5 } : undefined}
                >
                  <PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />
                  {shortName(p)}
                  {bidValue !== undefined ? ` — bid ${bidValue}` : isCurrent ? " — bidding now" : ""}
                </span>
              );
            })}
          </div>
          <p>Bids so far this round: {bidsSoFar} of {cardsThisRound} cards</p>
          {forbidden !== null && (
            <p style={{ color: "var(--red-suit)" }}>
              Can't bid {forbidden} — that would make the total exactly {cardsThisRound}.
            </p>
          )}
          <NumberPicker
            max={cardsThisRound}
            disabledValue={forbidden}
            onSelect={(n) => {
              const newBids = { ...bids, [currentBidder.id]: n };
              updateLive(
                isLastBidder
                  ? { phase: "declare", bids: newBids }
                  : { biddingIdx: biddingIdx + 1, bids: newBids }
              );
            }}
          />
          {biddingIdx > 0 && (
            <div className="btn-row" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="btn ghost"
                style={{ color: "var(--text-on-surface)", border: "2px solid var(--wood)" }}
                onClick={() => {
                  const prevBidder = bidOrder[biddingIdx - 1];
                  const newBids = { ...bids };
                  delete newBids[prevBidder.id];
                  updateLive({ biddingIdx: biddingIdx - 1, bids: newBids });
                }}
              >
                ← Back
              </button>
            </div>
          )}
        </div>
        {scoreTable}
        <RoundHistory
          session={session}
          rounds={rounds}
          gameType="oh-heck"
          unitLabel="Round"
          onDelete={deleteRound}
          busy={saving}
        />
      </div>
    );
  }

  // --- Declare phase -------------------------------------------------
  if (phase === "declare") {
    const totalBids = Object.values(bids).reduce((a, b) => a + b, 0);
    const label = getBidLabel(totalBids, cardsThisRound);
    return (
      <div>
        {header}
        <div className="card-surface">
          <h2>Bids: {totalBids} vs {cardsThisRound} cards — {label}</h2>
          <table className="score-table">
            <thead><tr><th>Player</th><th>Bid</th></tr></thead>
            <tbody>
              {bidOrder.map((p) => (
                <tr key={p.id}><td><PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />{shortName(p)}</td><td>{bids[p.id]}</td></tr>
              ))}
            </tbody>
          </table>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn ghost"
              style={{ color: "var(--text-on-surface)", border: "2px solid var(--wood)" }}
              onClick={() => updateLive({ phase: "bidding", biddingIdx: 0 })}
            >
              ← Edit bids
            </button>
            <button className="btn primary" onClick={() => updateLive({ phase: "scoring", scoringIdx: 0 })}>
              Move to scorekeeping
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Scoring phase ---------------------------------------------------
  if (phase === "scoring") {
    if (scoringIdx >= bidOrder.length) {
      // All players scored — check the tricks add up, then save the round.
      const totalTricksWon = bidOrder.reduce(
        (sum, p) => sum + (results[p.id]?.tricksWon || 0),
        0
      );
      const tricksMismatch = totalTricksWon !== cardsThisRound;

      async function saveRound() {
        setSaving(true);
        try {
          const totalBids = Object.values(bids).reduce((a, b) => a + b, 0);
          const roundRecord = {
            roundNumber: roundIndex + 1,
            cardsThisRound,
            dealerId: dealer.id,
            bidOrder: bidOrder.map((p) => p.id),
            bids,
            results,
            totalBids,
            bidLabel: getBidLabel(totalBids, cardsThisRound),
          };
          const newTotals = { ...totals };
          for (const p of session.players) {
            newTotals[p.id] = (newTotals[p.id] || 0) + (results[p.id]?.score || 0);
          }
          await updateSession(sessionId, {
            rounds: [...rounds, roundRecord],
            totals: newTotals,
            live: DEFAULT_LIVE,
          });
        } finally {
          setSaving(false);
        }
      }
      return (
        <div>
          {header}
          <div className="card-surface">
            <h2>Round {roundIndex + 1} scored</h2>
            <table className="score-table">
              <thead><tr><th>Player</th><th>Tricks won</th></tr></thead>
              <tbody>
                {bidOrder.map((p) => (
                  <tr key={p.id}><td><PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />{shortName(p)}</td><td>{results[p.id]?.tricksWon ?? 0}</td></tr>
                ))}
              </tbody>
            </table>
            {tricksMismatch && (
              <div className="warning-banner">
                ⚠️ Warning: doesn't add up. Tricks won total {totalTricksWon}, but {cardsThisRound} cards were dealt this round. Double-check before saving.
              </div>
            )}
            <div className="btn-row">
              <button
                type="button"
                className="btn ghost"
                style={{ color: "var(--text-on-surface)", border: "2px solid var(--wood)" }}
                onClick={() => updateLive({ scoringIdx: scoringIdx - 1 })}
              >
                ← Edit last score
              </button>
              <button className="btn primary" onClick={saveRound} disabled={saving}>
                {saving ? "Saving…" : "Save round & continue"}
              </button>
            </div>
          </div>
        </div>
      );
    }

    const currentScorer = bidOrder[scoringIdx];
    const theirBid = bids[currentScorer.id];

    return (
      <div>
        {header}
        <div className="card-surface">
          <h2><PlayerDot color={currentScorer.color} avatar={currentScorer.avatar} photo={currentScorer.photo} />{shortName(currentScorer)} bid {theirBid}. What did they get?</h2>
          <div className="chip-row" style={{ marginBottom: 10 }}>
            {bidOrder.map((p) => {
              const scored = results[p.id];
              const isCurrent = p.id === currentScorer.id;
              return (
                <span
                  key={p.id}
                  className={`player-chip ${isCurrent ? "selected" : ""}`}
                  style={!scored && !isCurrent ? { opacity: 0.5 } : undefined}
                >
                  <PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />
                  {shortName(p)}
                  {scored ? ` — got ${scored.tricksWon}` : isCurrent ? " — scoring now" : ` — bid ${bids[p.id]}`}
                </span>
              );
            })}
          </div>
          <div className="btn-row" style={{ marginBottom: 14 }}>
            <button
              className="btn primary"
              onClick={() => {
                const newResults = {
                  ...results,
                  [currentScorer.id]: { hitBid: true, tricksWon: theirBid, score: theirBid + 10 },
                };
                updateLive({ results: newResults, scoringIdx: scoringIdx + 1 });
              }}
            >
              Got their bid ({theirBid} + 10 = {theirBid + 10})
            </button>
          </div>
          <p>Or select what they actually got:</p>
          <NumberPicker
            max={cardsThisRound}
            disabledValue={theirBid}
            onSelect={(n) => {
              const newResults = { ...results, [currentScorer.id]: { hitBid: false, tricksWon: n, score: n } };
              updateLive({ results: newResults, scoringIdx: scoringIdx + 1 });
            }}
          />
          {scoringIdx > 0 && (
            <div className="btn-row" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="btn ghost"
                style={{ color: "var(--text-on-surface)", border: "2px solid var(--wood)" }}
                onClick={() => updateLive({ scoringIdx: scoringIdx - 1 })}
              >
                ← Back
              </button>
            </div>
          )}
        </div>
        {scoreTable}
      </div>
    );
  }

  return null;
}
