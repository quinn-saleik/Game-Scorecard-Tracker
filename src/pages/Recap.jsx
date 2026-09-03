import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import { subscribeToSession, rematchSession } from "../data/gameSessions";
import { subscribeToPlayers } from "../data/players";
import { subscribeToCompletedSessions } from "../data/gameSessions";
import { computePlayerDetail } from "../data/stats";
import { PLAY_ROUTE } from "../data/gameRoutes";
import PlayerDot from "../components/PlayerDot";
import { shortName } from "../data/playerNames";

function buildCallouts(winner, session, players, completedSessions) {
  const gameLabel = session.config?.customName || session.gameLabel;
  const detail = computePlayerDetail(winner.id, players, completedSessions);
  const callouts = [];
  if (!detail) return callouts;

  if (detail.wins === 1) {
    callouts.push("🎉 First win ever!");
  } else if (detail.currentStreak >= 2) {
    callouts.push(`🔥 Win streak: ${detail.currentStreak} games in a row!`);
  }

  const sameGame = detail.history.filter((h) => h.gameLabel === gameLabel && typeof h.score === "number");
  const thisScore = session.totals?.[winner.id];
  if (typeof thisScore === "number" && sameGame.length > 1) {
    const best = Math.max(...sameGame.map((h) => h.score));
    if (thisScore >= best) callouts.push(`🌟 New personal best in ${gameLabel}: ${thisScore}!`);
  }

  return callouts;
}

export default function Recap() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [players, setPlayers] = useState([]);
  const [completedSessions, setCompletedSessions] = useState([]);
  const [fired, setFired] = useState(false);
  const [rematching, setRematching] = useState(false);

  useEffect(() => subscribeToSession(sessionId, setSession), [sessionId]);
  useEffect(() => subscribeToPlayers(setPlayers), []);
  useEffect(() => subscribeToCompletedSessions(setCompletedSessions), []);

  useEffect(() => {
    if (fired || !session || session.status !== "completed") return;
    setFired(true);
    // canvas-confetti draws straight to <canvas>, so these need literal hex —
    // CSS custom properties don't resolve outside the DOM/CSSOM. Keep in
    // sync with the --gold/--wood/--red-suit/--cream tokens below by hand.
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 }, colors: ["#ab8a3f", "#1f2a3a", "#a12e2e", "#eef1f6"] });
    const t = setTimeout(
      () => confetti({ particleCount: 60, spread: 100, origin: { y: 0.4 }, colors: ["#ab8a3f", "#1f2a3a", "#a12e2e"] }),
      300
    );
    return () => clearTimeout(t);
  }, [session, fired]);

  if (!session) return <p className="empty-state">Loading…</p>;

  if (session.status !== "completed") {
    // Landed here directly without finishing — send them back to the game.
    return (
      <div className="card-surface">
        <p className="empty-state">This game hasn't finished yet.</p>
        <button className="btn primary" onClick={() => navigate("/")}>Back to games</button>
      </div>
    );
  }

  const gameLabel = session.config?.customName || session.gameLabel;
  const winners = session.players.filter((p) => session.winnerIds.includes(p.id));
  const totals = session.totals || {};
  // computePlayerDetail needs the just-finished session included — fall
  // back gracefully if the completedSessions listener hasn't caught up yet.
  const ready = completedSessions.some((s) => s.id === sessionId);

  async function playAgain() {
    setRematching(true);
    try {
      const newId = await rematchSession(session);
      const toPlay = PLAY_ROUTE[session.gameType];
      navigate(toPlay ? toPlay(newId) : "/");
    } finally {
      setRematching(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">
        <span className="suit red">🏆</span> {gameLabel} — Game over!
      </h1>

      <div className="card-surface">
        <h2>{winners.map((p) => shortName(p)).join(" & ")} {winners.length > 1 ? "win" : "wins"}!</h2>
        {winners.map((w) => {
          const callouts = ready ? buildCallouts(w, session, players, completedSessions) : [];
          return (
            <div key={w.id} style={{ marginBottom: 10 }}>
              <p style={{ fontWeight: 700 }}>
                <PlayerDot color={w.color} avatar={w.avatar} photo={w.photo} />
                {shortName(w)}
              </p>
              {callouts.map((c, i) => (
                <p key={i} style={{ margin: "2px 0 2px 20px", color: "var(--muted)" }}>{c}</p>
              ))}
            </div>
          );
        })}
      </div>

      <div className="card-surface">
        <h2>Final scores</h2>
        <table className="score-table">
          <thead><tr><th>Player</th><th>Score</th></tr></thead>
          <tbody>
            {session.players
              .slice()
              .sort((a, b) => (totals[b.id] ?? 0) - (totals[a.id] ?? 0))
              .map((p) => (
                <tr key={p.id}>
                  <td><PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />{shortName(p)}</td>
                  <td className={session.winnerIds.includes(p.id) ? "leader" : ""}>{totals[p.id] ?? 0}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="btn-row">
        <button className="btn primary" onClick={playAgain} disabled={rematching}>
          {rematching ? "Starting…" : "🔁 Rematch — same players"}
        </button>
        <button className="btn ghost" style={{ color: "var(--cream)" }} onClick={() => navigate("/")}>Play another game</button>
        <button className="btn ghost" style={{ color: "var(--cream)" }} onClick={() => navigate("/stats")}>View stats</button>
      </div>
    </div>
  );
}
