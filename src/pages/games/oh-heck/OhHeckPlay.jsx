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
  const [phase, setPhase] = useState("bidding"); // bidding | declare | scoring | confirm
  const [bids, setBids] = useState({});
  const [biddingIdx, setBiddingIdx] = useState(0);
  const [results, setResults] = useState({});
  const [scoringIdx, setScoringIdx] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeToSession(sessionId, setSession), [sessionId]);

  // Whenever the saved round count changes (a round was just written, or
  // undone), figure out whether more rounds remain or the game is over.
  useEffect(() => {
    if (!session) return;
    const seq = session.config?.roundSequence || [];
    if (session.rounds.length >= seq.length) {
      setPhase("confirm");
    } else {
      setPhase("bidding");
      setBids({});
      setBiddingIdx(0);
      setResults({});
      setScoringIdx(0);
    }
  }, [session?.rounds?.length]);

  if (!session) {
    return <p className="empty-state">Loading game…</p>;
  }

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

  const roundSequence = session.config?.roundSequence || [];
  const roundIndex = session.rounds.length;
  const rounds = session.rounds || [];
  const totals = session.totals || {};

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
        navigate("/stats");
      } finally {
        setSaving(false);
      }
    }

    return (
      <div>
        <h1 className="page-title">
          <span className="suit black">🂡</span> Oh Heck! — Final round complete
        </h1>
        <div className="card-surface">
          <h2>🏆 {winners.map((p) => p.name).join(" & ")}</h2>
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
                    <td><PlayerDot color={p.color} />{p.name}</td>
                    <td className={(totals[p.id] || 0) === maxTotal ? "leader" : ""}>{totals[p.id] || 0}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          <p>Double-check the last round before locking it in.</p>
          <div className="btn-row">
            <button className="btn ghost" style={{ color: "#2b2117", border: "2px solid #6b4226" }} onClick={undoLastRound} disabled={saving}>
              ← Undo last round
            </button>
            <button className="btn primary" onClick={confirmFinish} disabled={saving}>
              Confirm winner & finish
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- In-progress round setup ---------------------------------------
  const cardsThisRound = roundSequence[roundIndex];
  const dealerIndex = getDealerIndex(roundIndex, session.players.length);
  const dealer = session.players[dealerIndex];
  const bidOrder = getBidOrder(session.players, dealerIndex);
  const bidRule = session.config?.bidRule || "traditional";

  const header = (
    <h1 className="page-title">
      <span className="suit black">🂡</span> Oh Heck! — Round {roundIndex + 1} of {roundSequence.length} ({cardsThisRound} cards)
    </h1>
  );

  const undoButton = rounds.length > 0 && (
    <div className="btn-row" style={{ marginBottom: 12 }}>
      <button className="btn ghost" style={{ color: "#fdf6e8" }} onClick={undoLastRound} disabled={saving}>
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
              <td><PlayerDot color={p.color} />{p.name}{p.id === dealer.id ? " 🃏" : ""}</td>
              <td>{totals[p.id] || 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ color: "#6f6455", fontSize: 13 }}>🃏 = dealer this round</p>
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
          <h2>Bidding — <PlayerDot color={currentBidder.color} />{currentBidder.name}{currentBidder.id === dealer.id ? " (dealer)" : ""}</h2>
          <p>Bids so far this round: {bidsSoFar} of {cardsThisRound} cards</p>
          {forbidden !== null && (
            <p style={{ color: "#b3352c" }}>
              Can't bid {forbidden} — that would make the total exactly {cardsThisRound}.
            </p>
          )}
          <NumberPicker
            max={cardsThisRound}
            disabledValue={forbidden}
            onSelect={(n) => {
              setBids((prev) => ({ ...prev, [currentBidder.id]: n }));
              if (isLastBidder) {
                setPhase("declare");
              } else {
                setBiddingIdx((i) => i + 1);
              }
            }}
          />
          {biddingIdx > 0 && (
            <div className="btn-row" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="btn ghost"
                style={{ color: "#2b2117", border: "2px solid #6b4226" }}
                onClick={() => setBiddingIdx((i) => i - 1)}
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
                <tr key={p.id}><td><PlayerDot color={p.color} />{p.name}</td><td>{bids[p.id]}</td></tr>
              ))}
            </tbody>
          </table>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn ghost"
              style={{ color: "#2b2117", border: "2px solid #6b4226" }}
              onClick={() => { setPhase("bidding"); setBiddingIdx(0); }}
            >
              ← Edit bids
            </button>
            <button className="btn primary" onClick={() => setPhase("scoring")}>
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
                  <tr key={p.id}><td><PlayerDot color={p.color} />{p.name}</td><td>{results[p.id]?.tricksWon ?? 0}</td></tr>
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
                style={{ color: "#2b2117", border: "2px solid #6b4226" }}
                onClick={() => setScoringIdx((i) => i - 1)}
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
          <h2><PlayerDot color={currentScorer.color} />{currentScorer.name} bid {theirBid}. What did they get?</h2>
          <div className="btn-row" style={{ marginBottom: 14 }}>
            <button
              className="btn primary"
              onClick={() => {
                setResults((prev) => ({
                  ...prev,
                  [currentScorer.id]: { hitBid: true, tricksWon: theirBid, score: theirBid + 10 },
                }));
                setScoringIdx((i) => i + 1);
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
              setResults((prev) => ({
                ...prev,
                [currentScorer.id]: { hitBid: false, tricksWon: n, score: n },
              }));
              setScoringIdx((i) => i + 1);
            }}
          />
          {scoringIdx > 0 && (
            <div className="btn-row" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="btn ghost"
                style={{ color: "#2b2117", border: "2px solid #6b4226" }}
                onClick={() => setScoringIdx((i) => i - 1)}
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
