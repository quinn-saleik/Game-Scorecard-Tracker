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
import { subscribeToCustomGames } from "../data/customGames";
import { useVisiblePlayers, useInScope, useSessionFilter } from "../data/favoriteVisibility";
import ScopeToggle from "../components/ScopeToggle";
import ParBadge from "../components/ParBadge";
import { useWhoamiId } from "../data/whoami";
import PlayerDot from "../components/PlayerDot";
import { formatLastPlayed } from "../data/format";
import { shortName } from "../data/playerNames";

export default function Stats() {
  const [players, setPlayers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [trashed, setTrashed] = useState([]);
  const [customGames, setCustomGames] = useState([]);
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
    const unsub4 = subscribeToCustomGames(setCustomGames);
    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
    };
  }, []);

  const whoamiId = useWhoamiId();
  const visiblePlayersList = useVisiblePlayers(players);
  const playerInScope = useInScope(players);
  const sessionInScope = useSessionFilter(players);
  // Favorites filtering is UI convenience, not a lock (see
  // data/favoriteVisibility.js) — it only narrows what's shown when you've
  // picked who you are AND have favorites, and the Favorites/Everyone switch
  // turns it off. Applies to games and their derived stats, same scope.
  const scopedSessions = sessions.filter(sessionInScope);

  const playerStats = computePlayerStats(players, scopedSessions);
  // Every custom game gets a row too, even at 0 plays — same reasoning as
  // visiblePlayerStats below: a game someone just added to the home screen
  // shouldn't be invisible in Stats until after its first completed game.
  const playedStats = computeGameStats(scopedSessions);
  const playedKeys = new Set(playedStats.map((g) => g.groupKey));
  const unplayedCustomGames = customGames
    .filter((g) => !playedKeys.has(`other:${g.id}`))
    .map((g) => ({ groupKey: `other:${g.id}`, gameType: "other", label: g.name, count: 0 }));
  const gameStats = [...playedStats, ...unplayedCustomGames];
  // Show every in-scope active player, not just ones with a completed
  // game — a brand-new player with no history yet should show up with "—"
  // placeholders, not disappear from the table entirely. A removed
  // (inactive) player still shows up if they have real history to keep,
  // but drops off once they have none.
  const visibleIds = new Set(visiblePlayersList.map((p) => p.id));
  const visiblePlayerStats = playerStats.filter(
    (p) => playerInScope(p.playerId) && (p.gamesPlayed > 0 || visibleIds.has(p.playerId))
  );
  // Your own row floats to the top — everything else keeps its existing order.
  visiblePlayerStats.sort((a, b) => {
    if (a.playerId === whoamiId) return -1;
    if (b.playerId === whoamiId) return 1;
    return 0;
  });

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
      <ScopeToggle players={players} />
      <details className="card-surface par-explainer">
        <summary>
          <span aria-hidden="true">📏</span>
          <span>What are “par” and “vs par”?</span>
        </summary>
        <div className="par-explainer-body">
          <p>
            <strong>Par</strong> is the win rate you’d get from luck alone. In a 2-player game that’s 50%. With 4,
            it’s 25%, and with 8, it’s 12.5%.
          </p>
          <p>
            <strong>Vs par</strong> compares your wins to par:
          </p>
          <ul>
            <li><strong>1.0×</strong> means you win exactly as often as luck predicts.</li>
            <li><strong>2.0×</strong> means you win twice as often as luck.</li>
            <li><strong>0.5×</strong> means you win half as often.</li>
          </ul>
          <p>
            A green <span className="par-good">▲</span> means at or above par, and a red{" "}
            <span className="par-bad">▼</span> means below.
          </p>
          <h3>Why not just use win percentage?</h3>
          <p>
            Win % depends on how many people are playing. If you play Euchre all day, you’ll hover around 50%. In a
            10-player game of Oh Heck, your win % will be lower, even if you’re playing just as well.
          </p>
          <p>
            Winning 2 of 5 games is 40% either way. But luck alone gives you about 10% in a 10-player game of Oh
            Heck, and 50% in Euchre. So 40% in Oh Heck is about 4× par, while 40% in Euchre is below par (0.8×). Vs
            par shows what win % hides.
          </p>
        </div>
      </details>

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
              <p className="empty-state">No active players yet — add some from the Me tab.</p>
            ) : (
              <table className="score-table tight">
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Played</th>
                    <th>Win %</th>
                    <th>vs par</th>
                    <th>Favorite</th>
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
                      <td>
                        {p.gamesPlayed}
                        {p.lastPlayedAt && <span className="cell-sub">{formatLastPlayed(p.lastPlayedAt)}</span>}
                      </td>
                      <td>
                        {p.gamesPlayed ? `${p.winPct}%` : "—"}
                        {p.gamesPlayed > 0 && <span className="cell-sub">par {p.parPct}%</span>}
                      </td>
                      <td>
                        <ParBadge player={p} />
                      </td>
                      <td>{p.favoriteGame}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card-surface">
            <h2>Recent games</h2>
            {scopedSessions.length === 0 ? (
              <p className="empty-state">No completed games yet — finish a game and it'll show up here.</p>
            ) : (
              <>
                <p style={{ color: "var(--muted)", fontSize: 13 }}>
                  Tap a game to see its full scorepad. Delete a logged game if it was test data —
                  it drops out of everyone's stats right away, but lands in the Trash above so
                  it's not gone for good.
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
                    {scopedSessions.map((s) => {
                      const winners = (s.players || []).filter((p) => (s.winnerIds || []).includes(p.id));
                      return (
                        <tr key={s.id}>
                          <td>
                            <Link to={`/history/${s.id}`} style={{ color: "var(--text-on-surface)" }}>
                              {formatLastPlayed(s.completedAt?.toDate?.() || null)}
                            </Link>
                          </td>
                          <td>
                            <Link to={`/history/${s.id}`} style={{ color: "var(--text-on-surface)", fontWeight: 600 }}>
                              {gameGroupLabel(s)}
                            </Link>
                          </td>
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
                    <tr key={g.groupKey}>
                      <td>{g.label}</td>
                      <td>{g.count || "—"}</td>
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
