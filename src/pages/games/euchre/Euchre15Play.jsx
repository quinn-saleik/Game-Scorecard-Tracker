import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  subscribeToSession,
  updateSession,
  completeSession,
} from "../../../data/gameSessions";
import PlayerDot from "../../../components/PlayerDot";
import RoundHistory from "../../../components/RoundHistory";
import { recomputeTotals } from "../../../data/rounds";

const DEAL_SIZE = 15;

function TeamNames({ players }) {
  return players.map((p, i) => (
    <span key={p.id}>
      {i > 0 && " & "}
      <PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />{p.name}
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
  const [phase, setPhase] = useState("bidA"); // bidA | bidB | tricks | confirm
  const [bidA, setBidA] = useState(null);
  const [bidB, setBidB] = useState(null);
  const [tricksA, setTricksA] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeToSession(sessionId, setSession), [sessionId]);

  // Reset the in-progress hand whenever one gets saved (or undone).
  useEffect(() => {
    setPhase("bidA");
    setBidA(null);
    setBidB(null);
    setTricksA(null);
  }, [session?.rounds?.length]);

  if (!session) return <p className="empty-state">Loading game…</p>;

  if (session.status === "completed") {
    const winners = session.players.filter((p) => session.winnerIds.includes(p.id));
    return (
      <div className="card-surface">
        <h2>Game already finished</h2>
        <p>Winning team: {winners.map((p) => p.name).join(" & ")}</p>
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
        <h1 className="page-title"><span className="suit black">🃏</span> Euchre (15-card) — Hand {rounds.length + 1}</h1>
        {scoreTable}
        <div className="card-surface">
          <h2>🏆 {winningTeamPlayers.map((p) => p.name).join(" & ")} reached {threshold}!</h2>
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

  const tricksB = tricksA === null ? null : DEAL_SIZE - tricksA;
  const deltaA = tricksA === null ? 0 : tricksA >= bidA ? tricksA : -bidA;
  const deltaB = tricksB === null ? 0 : tricksB >= bidB ? tricksB : -bidB;

  async function saveRound() {
    setSaving(true);
    try {
      const newTotals = { ...totals };
      for (const id of teamAIds) newTotals[id] = (newTotals[id] || 0) + deltaA;
      for (const id of teamBIds) newTotals[id] = (newTotals[id] || 0) + deltaB;
      const newRound = {
        roundNumber: rounds.length + 1,
        teamABid: bidA,
        teamBBid: bidB,
        teamATricks: tricksA,
        teamBTricks: tricksB,
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
      <h1 className="page-title"><span className="suit black">🃏</span> Euchre (15-card) — Hand {rounds.length + 1}</h1>
      {scoreTable}

      {phase === "bidA" && (
        <div className="card-surface">
          <h2>How many tricks does <TeamNames players={teamAPlayers} /> bid?</h2>
          <NumberPicker
            max={DEAL_SIZE}
            onSelect={(n) => {
              setBidA(n);
              setPhase("bidB");
            }}
          />
        </div>
      )}

      {phase === "bidB" && (
        <div className="card-surface">
          <p><TeamNames players={teamAPlayers} /> bid {bidA}.</p>
          <h2>How many tricks does <TeamNames players={teamBPlayers} /> bid?</h2>
          <NumberPicker
            max={DEAL_SIZE}
            onSelect={(n) => {
              setBidB(n);
              setPhase("tricks");
            }}
          />
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button type="button" className="btn ghost" style={{ color: "var(--text-on-surface)", border: "2px solid #6b4226" }} onClick={() => setPhase("bidA")}>
              ← Back
            </button>
          </div>
        </div>
      )}

      {phase === "tricks" && (
        <div className="card-surface">
          <p>
            <TeamNames players={teamAPlayers} /> bid {bidA} · <TeamNames players={teamBPlayers} /> bid {bidB}
            {" — "}
            {bidA === bidB ? "tied bid, table decides trump" : bidA > bidB
              ? <><TeamNames players={teamAPlayers} /> won the bid, chooses trump</>
              : <><TeamNames players={teamBPlayers} /> won the bid, chooses trump</>}
          </p>
          <h2>How many tricks did <TeamNames players={teamAPlayers} /> win?</h2>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>The other team gets the rest of the {DEAL_SIZE}.</p>
          <NumberPicker
            max={DEAL_SIZE}
            onSelect={(n) => {
              setTricksA(n);
              setPhase("confirm");
            }}
          />
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button type="button" className="btn ghost" style={{ color: "var(--text-on-surface)", border: "2px solid #6b4226" }} onClick={() => setPhase("bidB")}>
              ← Back
            </button>
          </div>
        </div>
      )}

      {phase === "confirm" && (
        <div className="card-surface">
          <h2>Confirm hand {rounds.length + 1}</h2>
          <table className="score-table">
            <thead><tr><th>Team</th><th>Bid</th><th>Tricks</th><th>Score</th></tr></thead>
            <tbody>
              <tr>
                <td><TeamNames players={teamAPlayers} /></td>
                <td>{bidA}</td>
                <td>{tricksA}</td>
                <td>{deltaA >= 0 ? `+${deltaA}` : deltaA}</td>
              </tr>
              <tr>
                <td><TeamNames players={teamBPlayers} /></td>
                <td>{bidB}</td>
                <td>{tricksB}</td>
                <td>{deltaB >= 0 ? `+${deltaB}` : deltaB}</td>
              </tr>
            </tbody>
          </table>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button type="button" className="btn ghost" style={{ color: "var(--text-on-surface)", border: "2px solid #6b4226" }} onClick={() => setPhase("tricks")}>
              ← Edit tricks
            </button>
            <button className="btn primary" onClick={saveRound} disabled={saving}>
              {saving ? "Saving…" : "Save hand & continue"}
            </button>
          </div>
        </div>
      )}

      {rounds.length > 0 && phase === "bidA" && (
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
