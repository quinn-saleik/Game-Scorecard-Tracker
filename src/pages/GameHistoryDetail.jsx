import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { subscribeToSession, updateSession } from "../data/gameSessions";
import { getInitialTotals, getRoundDelta } from "../data/rounds";
import { gameGroupLabel } from "../data/stats";
import PlayerDot from "../components/PlayerDot";
import { shortName } from "../data/playerNames";

function formatDateStamp(date) {
  if (!date) return "—";
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// The full scorepad for one past game: every round's delta plus the running
// cumulative total, side by side, per player — the same shape as the paper
// scorepad it replaced. Works for any game type since it only relies on the
// generic getInitialTotals/getRoundDelta helpers every Play screen's round
// history already uses, rather than each game's own round-record shape.
export default function GameHistoryDetail() {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  useEffect(() => subscribeToSession(sessionId, setSession), [sessionId]);

  // Seed the textarea from the saved note once, the first time this
  // session loads — not on every snapshot update, or a note someone is
  // mid-typing would get stomped the moment any other field on the
  // session changes (e.g. a round edited from another device).
  useEffect(() => {
    if (session && !notesLoaded) {
      setNotesDraft(session.notes || "");
      setNotesLoaded(true);
    }
  }, [session, notesLoaded]);

  if (!session) return <p className="empty-state">Loading…</p>;

  async function saveNotes() {
    setSavingNotes(true);
    setNotesSaved(false);
    try {
      await updateSession(sessionId, { notes: notesDraft });
      setNotesSaved(true);
    } finally {
      setSavingNotes(false);
    }
  }

  const rounds = session.rounds || [];
  const totals = session.totals || {};
  const players = session.players || [];
  const winners = players.filter((p) => (session.winnerIds || []).includes(p.id));
  const completedAt = session.completedAt?.toDate?.() || null;

  // Running cumulative total per player, one snapshot after each round —
  // recomputed here rather than trusted from anywhere else so a manually
  // edited/deleted round always shows correct history.
  const running = getInitialTotals(session.gameType, session);
  const rows = rounds.map((round, i) => {
    for (const p of players) {
      running[p.id] = (running[p.id] || 0) + getRoundDelta(session.gameType, round, p.id, session);
    }
    return { roundNumber: i + 1, cumulative: { ...running } };
  });

  return (
    <div>
      <h1 className="page-title">
        <span className="suit red">📜</span> {gameGroupLabel(session)}
      </h1>
      <p style={{ color: "var(--muted)", fontSize: 14, marginTop: -8 }}>
        {session.status === "completed" ? formatDateStamp(completedAt) : "Still in progress"}
      </p>

      <div className="card-surface">
        <h2>
          {session.status === "completed"
            ? `🏆 ${winners.map((p) => shortName(p)).join(" & ") || "—"}`
            : "Final scores so far"}
        </h2>
        <table className="score-table">
          <thead><tr><th>Player</th><th>Total</th></tr></thead>
          <tbody>
            {players
              .slice()
              .sort((a, b) => (totals[b.id] || 0) - (totals[a.id] || 0))
              .map((p) => (
                <tr key={p.id}>
                  <td><PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />{shortName(p)}</td>
                  <td className={(session.winnerIds || []).includes(p.id) ? "leader" : ""}>{totals[p.id] || 0}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="card-surface">
        <h2>Full scorepad</h2>
        {rows.length === 0 ? (
          <p className="empty-state">No rounds recorded for this game.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="score-table">
              <thead>
                <tr>
                  <th>#</th>
                  {players.map((p) => (
                    <th key={p.id}>
                      <PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />{shortName(p)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}>
                    <td>{row.roundNumber}</td>
                    {players.map((p) => {
                      const delta = getRoundDelta(session.gameType, rounds[i], p.id, session);
                      return (
                        <td key={p.id} style={{ whiteSpace: "nowrap" }}>
                          <span style={{ fontWeight: 600 }}>{delta >= 0 ? `+${delta}` : delta}</span>
                          <span style={{ color: "var(--muted)", fontSize: 12, marginLeft: 6 }}>
                            ({row.cumulative[p.id] || 0})
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p style={{ color: "var(--muted)", fontSize: 13 }}>Each cell is that round's score, with the running total in parentheses.</p>
      </div>

      <div className="card-surface">
        <h2>Notes</h2>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: -6 }}>
          Any additional info? "Quinn cheated (we think)", "Ryan was a sore loser" — whatever's worth remembering about this one.
        </p>
        <div className="field" style={{ marginBottom: 10 }}>
          <textarea
            className="input"
            rows={3}
            placeholder="Add a note about this game…"
            value={notesDraft}
            onChange={(e) => {
              setNotesDraft(e.target.value);
              setNotesSaved(false);
            }}
          />
        </div>
        <div className="btn-row" style={{ alignItems: "center" }}>
          <button
            type="button"
            className="btn primary"
            onClick={saveNotes}
            disabled={savingNotes || notesDraft === (session.notes || "")}
          >
            {savingNotes ? "Saving…" : "Save note"}
          </button>
          {notesSaved && <span style={{ color: "var(--muted)", fontSize: 13 }}>Saved.</span>}
        </div>
      </div>

      <div className="btn-row">
        <Link className="btn ghost" style={{ color: "var(--text-on-surface)", border: "2px solid var(--wood)" }} to="/stats">
          ← Back to Stats
        </Link>
      </div>
    </div>
  );
}
