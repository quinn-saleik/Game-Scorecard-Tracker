import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { subscribeToPlayers } from "../data/players";
import {
  subscribeToCompletedSessions,
  subscribeToTrashedSessions,
  softDeleteSession,
  restoreSession,
  deleteSession,
} from "../data/gameSessions";
import { computePlayerStats, computeGameStats, gameGroupLabel } from "../data/stats";
import PlayerDot from "../components/PlayerDot";
import { formatLastPlayed } from "../data/format";
import { shortName } from "../data/playerNames";

export default function Stats() {
  const [players, setPlayers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [trashed, setTrashed] = useState([]);
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
    const unsub3 = subscribeToTrashedSessions(setTrashed);
    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, []);

  const playerStats = computePlayerStats(players, sessions);
  const gameStats = computeGameStats(sessions);
  // Show every active player, not just ones with a completed game — a
  // brand-new player with no history yet should show up with "—"
  // placeholders, not disappear from the table entirely. A removed
  // (inactive) player still shows up if they have real history to keep,
  // but drops off once they have none.
  const activeIds = new Set(players.filter((p) => p.active).map((p) => p.id));
  const visiblePlayerStats = playerStats.filter((p) => p.gamesPlayed > 0 || activeIds.has(p.playerId));

  async function handleDelete(session) {
    const label = gameGroupLabel(session);
    if (!window.confirm(`Move this completed ${label} game to trash? It'll drop out of everyone's stats right away, but you can restore it later from the Trash below.`)) {
      return;
    }
    setBusyId(session.id);
    try {
      await softDeleteSession(session.id);
    } finally {
      setBusyId(null);
    }
  }

  async function handleRestore(session) {
    setBusyId(session.id);
    try {
      await restoreSession(session.id);
    } finally {
      setBusyId(null);
    }
  }

  async function handlePurge(session) {
    const label = gameGroupLabel(session);
    if (!window.confirm(`Permanently delete this ${label} game? This can't be undone.`)) {
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
      ) : (
        <>
          {trashed.length > 0 && (
            <div className="card-surface">
              <h2>Trash ({trashed.length})</h2>
              <p style={{ color: "var(--muted)", fontSize: 13 }}>
                Deleted games land here first. Restore one to bring it back into everyone's
                stats, or delete it forever to actually remove it.
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
                  {trashed.map((s) => {
                    const winners = (s.players || []).filter((p) => (s.winnerIds || []).includes(p.id));
                    return (
                      <tr key={s.id}>
                        <td>{formatLastPlayed(s.completedAt?.toDate?.() || null)}</td>
                        <td>{gameGroupLabel(s)}</td>
                        <td>{winners.map((p) => shortName(p)).join(" & ") || "—"}</td>
                        <td>
                          <span className="btn-row">
                            <button
                              type="button"
                              className="btn ghost small"
                              style={{ color: "var(--text-on-surface)", border: "2px solid var(--wood)" }}
                              onClick={() => handleRestore(s)}
                              disabled={busyId === s.id}
                            >
                              {busyId === s.id ? "Restoring…" : "↺ Restore"}
                            </button>
                            <button
                              type="button"
                              className="btn danger small"
                              onClick={() => handlePurge(s)}
                              disabled={busyId === s.id}
                            >
                              Delete forever
                            </button>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="card-surface">
            <h2>By player</h2>
            {visiblePlayerStats.length === 0 ? (
              <p className="empty-state">No active players yet — add some on the Players tab.</p>
            ) : (
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
                  {visiblePlayerStats.map((p) => (
                    <tr key={p.playerId}>
                      <td>
                        <Link to={`/players/${p.playerId}`} style={{ color: "var(--text-on-surface)", fontWeight: 600 }}>
                          <PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />{shortName(p)}
                        </Link>
                      </td>
                      <td>{p.gamesPlayed}</td>
                      <td>{p.gamesPlayed ? `${p.winPct}%` : "—"}</td>
                      <td>{p.gamesPlayed ? p.avgScore : "—"}</td>
                      <td>{p.favoriteGame}</td>
                      <td>{formatLastPlayed(p.lastPlayedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card-surface">
            <h2>Recent games</h2>
            {sessions.length === 0 ? (
              <p className="empty-state">No completed games yet — finish a game and it'll show up here.</p>
            ) : (
              <>
                <p style={{ color: "var(--muted)", fontSize: 13 }}>
                  Delete a logged game if it was test data — it drops out of everyone's stats
                  right away, but lands in the Trash above so it's not gone for good.
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
                          <td>{winners.map((p) => shortName(p)).join(" & ") || "—"}</td>
                          <td>
                            <button
                              className="btn danger small"
                              onClick={() => handleDelete(s)}
                              disabled={busyId === s.id}
                            >
                              {busyId === s.id ? "Moving…" : "🗑️ Delete"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}
          </div>

          <div className="card-surface">
            <h2>Games played</h2>
            {gameStats.length === 0 ? (
              <p className="empty-state">No completed games yet.</p>
            ) : (
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
            )}
          </div>
        </>
      )}
    </div>
  );
}
