import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { subscribeToPlayers } from "../data/players";
import { subscribeToCompletedSessions } from "../data/gameSessions";
import { computePlayerDetail, computeAchievements } from "../data/stats";
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
  const badges = computeAchievements(detail);

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
        <PlayerDot color={detail.color} avatar={detail.avatar} photo={detail.photo} />
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
        <h2>Achievements</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {badges.map((b) => (
            <div
              key={b.id}
              title={b.description}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: 84,
                padding: "10px 6px",
                borderRadius: 10,
                textAlign: "center",
                background: b.earned ? "var(--card-white)" : "transparent",
                border: `2px solid ${b.earned ? "var(--gold, #d9a441)" : "var(--border-soft)"}`,
                opacity: b.earned ? 1 : 0.4,
              }}
            >
              <span style={{ fontSize: 26 }}>{b.emoji}</span>
              <span style={{ fontSize: 12, fontWeight: 700, marginTop: 4 }}>{b.label}</span>
              <span style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{b.description}</span>
            </div>
          ))}
        </div>
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

      <Link className="btn ghost" style={{ color: "var(--text-on-surface)", border: "2px solid #6b4226" }} to="/players">
        ← Back to Players
      </Link>
    </div>
  );
}
