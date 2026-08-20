import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  seedDefaultPlayers,
  addPlayer,
  setPlayerActive,
  setPlayerColor,
  subscribeToPlayers,
} from "../data/players";
import { subscribeToCompletedSessions } from "../data/gameSessions";
import { computePlayerStats } from "../data/stats";
import { PLAYER_COLORS } from "../data/playerColors";
import PlayerDot from "../components/PlayerDot";
import { formatLastPlayed } from "../data/format";

export default function Players() {
  const [players, setPlayers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [colorPickerFor, setColorPickerFor] = useState(null);

  useEffect(() => {
    seedDefaultPlayers().catch((err) =>
      console.error("Failed to seed default players:", err)
    );
    const unsubPlayers = subscribeToPlayers((list) => {
      setPlayers(list);
      setLoading(false);
    });
    const unsubSessions = subscribeToCompletedSessions((list) => setSessions(list));
    return () => {
      unsubPlayers();
      unsubSessions();
    };
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    try {
      await addPlayer(newName);
      setNewName("");
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(player) {
    setBusy(true);
    try {
      await setPlayerActive(player.id, !player.active);
    } finally {
      setBusy(false);
    }
  }

  async function pickColor(playerId, hex) {
    setBusy(true);
    try {
      await setPlayerColor(playerId, hex);
    } finally {
      setBusy(false);
      setColorPickerFor(null);
    }
  }

  const active = players.filter((p) => p.active);
  const inactive = players.filter((p) => !p.active);
  const stats = computePlayerStats(active, sessions);
  const statsById = new Map(stats.map((s) => [s.playerId, s]));

  return (
    <div>
      <h1 className="page-title">
        <span className="suit black">♣</span> Players
      </h1>

      <div className="card-surface">
        <h2>Add a player</h2>
        <form onSubmit={handleAdd} className="btn-row">
          <input
            className="input"
            style={{ flex: 1, minWidth: 160 }}
            placeholder="Player name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            disabled={busy}
          />
          <button className="btn primary" type="submit" disabled={busy}>
            Add
          </button>
        </form>
      </div>

      <div className="card-surface">
        <h2>Roster ({active.length})</h2>
        <p style={{ color: "#6f6455", fontSize: 14, marginTop: -6 }}>
          Tap a player's dot to set their color — it shows up next to their name in every game.
        </p>
        {loading ? (
          <p className="empty-state">Loading…</p>
        ) : active.length === 0 ? (
          <p className="empty-state">No active players yet.</p>
        ) : (
          <table className="score-table">
            <thead>
              <tr>
                <th></th>
                <th>Player</th>
                <th>Played</th>
                <th>Win %</th>
                <th>Favorite</th>
                <th>Last played</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {active.map((p) => {
                const s = statsById.get(p.id);
                const pickerOpen = colorPickerFor === p.id;
                return (
                  <Fragment key={p.id}>
                    <tr>
                      <td>
                        <button
                          type="button"
                          onClick={() => setColorPickerFor(pickerOpen ? null : p.id)}
                          title="Set color"
                          style={{
                            background: "none",
                            border: "none",
                            padding: 4,
                            cursor: "pointer",
                          }}
                        >
                          <PlayerDot color={p.color} />
                        </button>
                      </td>
                      <td>
                        <Link to={`/players/${p.id}`} style={{ color: "#2b2117", fontWeight: 600 }}>
                          {p.name}
                        </Link>
                      </td>
                      <td>{s?.gamesPlayed || 0}</td>
                      <td>{s?.gamesPlayed ? `${s.winPct}%` : "—"}</td>
                      <td>{s?.gamesPlayed ? s.favoriteGame : "—"}</td>
                      <td>{formatLastPlayed(s?.lastPlayedAt)}</td>
                      <td>
                        <span
                          className="player-chip"
                          style={{ padding: "4px 10px", fontSize: 13 }}
                          onClick={() => toggleActive(p)}
                          title="Remove from active roster"
                        >
                          ✕
                        </span>
                      </td>
                    </tr>
                    {pickerOpen && (
                      <tr>
                        <td colSpan={7} style={{ background: "#fbf6e9" }}>
                          <div className="chip-row" style={{ padding: "10px 4px" }}>
                            {PLAYER_COLORS.map((c) => {
                              const takenBy = active.find(
                                (other) => other.id !== p.id && other.color === c.hex
                              );
                              return (
                                <button
                                  type="button"
                                  key={c.hex}
                                  onClick={() => pickColor(p.id, c.hex)}
                                  disabled={busy}
                                  title={takenBy ? `${c.name} — already ${takenBy.name}'s color` : c.name}
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: 4,
                                    background: "none",
                                    border: p.color === c.hex ? "2px solid #6b4226" : "2px solid transparent",
                                    borderRadius: 10,
                                    padding: 6,
                                    cursor: "pointer",
                                  }}
                                >
                                  <span
                                    style={{
                                      width: 22,
                                      height: 22,
                                      borderRadius: "50%",
                                      background: c.hex,
                                      border: "1px solid rgba(0,0,0,0.15)",
                                    }}
                                  />
                                  <span style={{ fontSize: 11, color: "#6f6455" }}>
                                    {takenBy ? `${c.name} (${takenBy.name})` : c.name}
                                  </span>
                                </button>
                              );
                            })}
                            <button
                              type="button"
                              className="btn ghost small"
                              style={{ color: "#2b2117", border: "2px solid #6b4226", alignSelf: "center" }}
                              onClick={() => pickColor(p.id, null)}
                              disabled={busy}
                            >
                              No color
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {inactive.length > 0 && (
        <div className="card-surface">
          <h2>Removed players ({inactive.length})</h2>
          <div className="chip-row">
            {inactive.map((p) => (
              <span
                key={p.id}
                className="player-chip inactive"
                onClick={() => toggleActive(p)}
                title="Tap to restore"
                style={{ cursor: "pointer", opacity: 1 }}
              >
                {p.name} ↺
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
