import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { subscribeToPlayers } from "../data/players";
import { subscribeToCompletedSessions, deleteSession } from "../data/gameSessions";
import { computePlayerStats, computeGameStats, gameGroupLabel } from "../data/stats";
import PlayerDot from "../components/PlayerDot";
import { formatLastPlayed } from "../data/format";

export default function Stats() {
  const [players, setPlayers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let playersLoaded = false;
    let sessionsLoaded = false;
    const check = () => {
      if (playersLoaded && sessionsLoaded) setLoading(false);
    };
    const unsub1 = subscribeToPlayers((list) => {
      setPlayers(list);
      playersLoaded = true;
      check();
    });
    const unsub2 = subscribeToCompletedSessions((list) => {
      setSessions(list);
      sessionsLoaded = true;
      check();
    });
    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  const playerStats = computePlayerStats(players, sessions);
  const gameStats = computeGameStats(sessions);

  async function handleDelete(session) {
    const label = gameGroupLabel(session);
    if (!window.confirm(`Delete this completed ${label} game? This can't be undone and updates everyone's stats immediately.`)) {
      return;
    }
    setBusyId(session.id);
    try {
      await deleteSession(session.id);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1 className="page-title">
        <span className="suit red">♦</span> Stats
      </h1>

      {loading ? (
        <p className="empty-state">Loading…</p>
      ) : sessions.length === 0 ? (
        <div className="card-surface">
          <p className="empty-state">
            No games logged yet — finish a game and stats will show up here.
          </p>
        </div>
      ) : (
        <>
          <div className="card-surface">
            <h2>By player</h2>
            <table className="score-table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Played</th>
                  <th>Win %</th>
                  <th>Avg score</th>
                  <th>Favorite</th>
                  <th>Last played</th>
                </tr>
              </thead>
              <tbody>
                {playerStats
                  .filter((p) => p.gamesPlayed > 0)
                  .map((p) => (
                    <tr key={p.playerId}>
                      <td>
                        <Link to={`/players/${p.playerId}`} style={{ color: "var(--text-on-surface)", fontWeight: 600 }}>
                          <PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />{p.name}
                        </Link>
                      </td>
                      <td>{p.gamesPlayed}</td>
                      <td>{p.winPct}%</td>
                      <td>{p.avgScore}</td>
                      <td>{p.favoriteGame}</td>
                      <td>{formatLastPlayed(p.lastPlayedAt)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="card-surface">
            <h2>Recent games</h2>
            <p style={{ color: "var(--muted)", fontSize: 13 }}>
              Delete a logged game if it was test data — this can't be undone and updates
              everyone's stats right away.
            </p>
            <table className="score-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Game</th>
                  <th>Winner</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => {
                  const winners = (s.players || []).filter((p) => (s.winnerIds || []).includes(p.id));
                  return (
                    <tr key={s.id}>
                      <td>{formatLastPlayed(s.completedAt?.toDate?.() || null)}</td>
                      <td>{gameGroupLabel(s)}</td>
                      <td>{winners.map((p) => p.name).join(" & ") || "—"}</td>
                      <td>
                        <button
                          className="btn danger small"
                          onClick={() => handleDelete(s)}
                          disabled={busyId === s.id}
                        >
                          {busyId === s.id ? "Deleting…" : "🗑️ Delete"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="card-surface">
            <h2>Games played</h2>
            <table className="score-table">
              <thead>
                <tr>
                  <th>Game</th>
                  <th>Times played</th>
                </tr>
              </thead>
              <tbody>
                {gameStats.map((g) => (
                  <tr key={g.gameType}>
                    <td>{g.label}</td>
                    <td>{g.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
