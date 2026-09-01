import { useEffect, useState } from "react";
import { subscribeToPlayers } from "../data/players";
import { subscribeToCompletedSessions } from "../data/gameSessions";
import { computePlayerStats, computeGameStats } from "../data/stats";

export default function Stats() {
  const [players, setPlayers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

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
                </tr>
              </thead>
              <tbody>
                {playerStats
                  .filter((p) => p.gamesPlayed > 0)
                  .map((p) => (
                    <tr key={p.playerId}>
                      <td>{p.name}</td>
                      <td>{p.gamesPlayed}</td>
                      <td>{p.winPct}%</td>
                      <td>{p.avgScore}</td>
                      <td>{p.favoriteGame}</td>
                    </tr>
                  ))}
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
