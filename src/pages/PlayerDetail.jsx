import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { subscribeToPlayers } from "../data/players";
import { subscribeToCompletedSessions } from "../data/gameSessions";
import { computePlayerDetail } from "../data/stats";
import { formatLastPlayed } from "../data/format";
import PlayerDot from "../components/PlayerDot";

export default function PlayerDetail() {
  const { playerId } = useParams();
  const [players, setPlayers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let playersLoaded = false;
    let sessionsLoaded = false;
    const check = () => { if (playersLoaded && sessionsLoaded) setLoading(false); };
    const unsub1 = subscribeToPlayers((list) => { setPlayers(list); playersLoaded = true; check(); });
    const unsub2 = subscribeToCompletedSessions((list) => { setSessions(list); sessionsLoaded = true; check(); });
    return () => { unsub1(); unsub2(); };
  }, []);

  if (loading) return <p className="empty-state">Loading…</p>;

  const detail = computePlayerDetail(playerId, players, sessions);

  if (!detail) {
    return (
      <div className="card-surface">
        <p className="empty-state">Player not found.</p>
        <Link className="btn primary" to="/players">Back to Players</Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">
        <PlayerDot color={detail.color} />
        {detail.name}
      </h1>

      <div className="card-surface">
        <h2>Overview</h2>
        <table className="score-table">
          <tbody>
            <tr><td>Games played</td><td>{detail.gamesPlayed}</td></tr>
            <tr><td>Win %</td><td>{detail.gamesPlayed ? `${detail.winPct}%` : "—"}</td></tr>
            <tr><td>Avg score</td><td>{detail.gamesPlayed ? detail.avgScore : "—"}</td></tr>
            <tr><td>Favorite game</td><td>{detail.favoriteGame}</td></tr>
            <tr><td>Last played</td><td>{formatLastPlayed(detail.lastPlayedAt)}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="card-surface">
        <h2>Streaks</h2>
        <table className="score-table">
          <tbody>
            <tr>
              <td>Current win streak</td>
              <td>{detail.currentStreak > 0 ? `🔥 ${detail.currentStreak} game${detail.currentStreak > 1 ? "s" : ""}` : "—"}</td>
            </tr>
            <tr>
              <td>Longest win streak</td>
              <td>{detail.longestStreak > 0 ? `${detail.longestStreak} game${detail.longestStreak > 1 ? "s" : ""}` : "—"}</td>
            </tr>
            <tr>
              <td>Last game won</td>
              <td>
                {detail.lastWin
                  ? `${detail.lastWin.gameLabel} on ${formatLastPlayed(detail.lastWin.completedAt)}`
                  : "No wins yet"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card-surface">
        <h2>Game history</h2>
        {detail.history.length === 0 ? (
          <p className="empty-state">No completed games yet.</p>
        ) : (
          <table className="score-table">
            <thead>
              <tr><th>Date</th><th>Game</th><th>Result</th><th>Score</th></tr>
            </thead>
            <tbody>
              {detail.history.map((g) => (
                <tr key={g.sessionId}>
                  <td>{formatLastPlayed(g.completedAt)}</td>
                  <td>{g.gameLabel}</td>
                  <td className={g.won ? "leader" : ""}>{g.won ? "🏆 Won" : "Lost"}</td>
                  <td>{g.score ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Link className="btn ghost" style={{ color: "#2b2117", border: "2px solid #6b4226" }} to="/players">
        ← Back to Players
      </Link>
    </div>
  );
}
