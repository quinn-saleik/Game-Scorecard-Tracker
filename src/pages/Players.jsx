import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  addPlayer,
  deletePlayer,
  deleteDefaultPlayers,
  setPlayerActive,
  setPlayerColor,
  setPlayerAvatar,
  setPlayerPhoto,
  updatePlayerName,
  subscribeToPlayers,
  purgeStaleRemovedPlayers,
  removedPlayerTimeLeftMs,
} from "../data/players";
import { subscribeToCompletedSessions } from "../data/gameSessions";
import { computePlayerStats } from "../data/stats";
import { PLAYER_COLORS } from "../data/playerColors";
import { PLAYER_AVATARS } from "../data/playerAvatars";
import { fileToPlayerPhoto } from "../data/photo";
import PlayerDot from "../components/PlayerDot";
import { formatLastPlayed } from "../data/format";
import { shortName } from "../data/playerNames";

// "~2h" / "<1h" — coarse on purpose, this is just a heads-up, not a countdown.
function formatTimeLeft(ms) {
  const hours = ms / (60 * 60 * 1000);
  return hours < 1 ? "<1h" : `~${Math.ceil(hours)}h`;
}

export default function Players() {
  const [players, setPlayers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [busy, setBusy] = useState(false);
  const [colorPickerFor, setColorPickerFor] = useState(null);
  const [avatarPickerFor, setAvatarPickerFor] = useState(null);
  const [nameEditFor, setNameEditFor] = useState(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [clearingDefaults, setClearingDefaults] = useState(false);

  useEffect(() => {
    const unsubPlayers = subscribeToPlayers((list) => {
      setPlayers(list);
      setLoading(false);
      // Opportunistic, fire-and-forget: hard-deletes anyone past their
      // removal grace period, back-fills deactivatedAt for legacy removed
      // players. Nothing else in this app runs on a schedule to do this.
      purgeStaleRemovedPlayers(list).catch((err) => console.error("purgeStaleRemovedPlayers failed:", err));
    });
    const unsubSessions = subscribeToCompletedSessions((list) => setSessions(list));
    return () => {
      unsubPlayers();
      unsubSessions();
    };
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!newFirstName.trim() || !newLastName.trim()) return;
    setBusy(true);
    try {
      await addPlayer(newFirstName, newLastName);
      setNewFirstName("");
      setNewLastName("");
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(player) {
    if (!window.confirm(`Delete ${player.name} entirely? This can't be undone — past games they played in keep their name, but they'll no longer have a roster entry or stats page.`)) return;
    setBusy(true);
    try {
      await deletePlayer(player.id);
    } finally {
      setBusy(false);
    }
  }

  async function handleClearDefaults() {
    if (!window.confirm("Remove all of the sample default players?")) return;
    setClearingDefaults(true);
    try {
      await deleteDefaultPlayers();
    } finally {
      setClearingDefaults(false);
    }
  }

  function startEditName(player) {
    setNameEditFor(player.id);
    setEditFirstName(player.firstName || player.name?.split(" ")[0] || "");
    setEditLastName(player.lastName || player.name?.split(" ").slice(1).join(" ") || "");
  }

  async function saveEditName(playerId) {
    setBusy(true);
    try {
      await updatePlayerName(playerId, editFirstName, editLastName);
      setNameEditFor(null);
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

  async function pickAvatar(playerId, emoji) {
    setBusy(true);
    try {
      await setPlayerAvatar(playerId, emoji);
    } finally {
      setBusy(false);
      setAvatarPickerFor(null);
    }
  }

  async function pickPhoto(playerId, file) {
    setBusy(true);
    try {
      const dataUrl = await fileToPlayerPhoto(file);
      await setPlayerPhoto(playerId, dataUrl);
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function clearPhoto(playerId) {
    setBusy(true);
    try {
      await setPlayerPhoto(playerId, null);
    } finally {
      setBusy(false);
    }
  }

  const active = players.filter((p) => p.active);
  // Client-side mirror of purgeStaleRemovedPlayers' expiry check, so a
  // player past their grace period never flashes on screen even for the
  // moment before the fire-and-forget delete above lands.
  const inactive = players.filter((p) => !p.active && removedPlayerTimeLeftMs(p) > 0);
  const stats = computePlayerStats(active, sessions);
  const statsById = new Map(stats.map((s) => [s.playerId, s]));
  const hasDefaults = players.some((p) => p.isDefault);

  return (
    <div>
      <h1 className="page-title">
        <span className="suit black">♣</span> Players
      </h1>

      {hasDefaults && (
        <div className="card-surface">
          <p style={{ margin: 0 }}>Sample default players are still on the roster.</p>
          <button
            className="btn ghost small"
            style={{ color: "var(--text-on-surface)", border: "2px solid var(--wood)", marginTop: 8 }}
            onClick={handleClearDefaults}
            disabled={clearingDefaults}
          >
            {clearingDefaults ? "Removing…" : "Remove all default players"}
          </button>
        </div>
      )}

      <div className="card-surface">
        <h2>Add a player</h2>
        <form onSubmit={handleAdd} className="btn-row">
          <input
            className="input"
            style={{ flex: 1, minWidth: 120 }}
            placeholder="First name"
            value={newFirstName}
            onChange={(e) => setNewFirstName(e.target.value)}
            disabled={busy}
          />
          <input
            className="input"
            style={{ flex: 1, minWidth: 120 }}
            placeholder="Last name"
            value={newLastName}
            onChange={(e) => setNewLastName(e.target.value)}
            disabled={busy}
          />
          <button className="btn primary" type="submit" disabled={busy}>
            Add
          </button>
        </form>
      </div>

      <div className="card-surface">
        <h2>Roster ({active.length})</h2>
        <p style={{ color: "var(--muted)", fontSize: 14, marginTop: -6 }}>
          Tap a player's dot to set their color, their avatar to pick an emoji, or the camera to
          add a photo — a photo takes over from the emoji wherever they show up in the app.
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
                <th></th>
                <th></th>
                <th>Player</th>
                <th>Played</th>
                <th>Win %</th>
                <th>Favorite</th>
                <th>Last played</th>
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {active.map((p) => {
                const s = statsById.get(p.id);
                const pickerOpen = colorPickerFor === p.id;
                const avatarOpen = avatarPickerFor === p.id;
                const nameEditOpen = nameEditFor === p.id;
                return (
                  <Fragment key={p.id}>
                    <tr>
                      <td>
                        <button
                          type="button"
                          onClick={() => {
                            setColorPickerFor(pickerOpen ? null : p.id);
                            setAvatarPickerFor(null);
                            setNameEditFor(null);
                          }}
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
                        <button
                          type="button"
                          onClick={() => {
                            setAvatarPickerFor(avatarOpen ? null : p.id);
                            setColorPickerFor(null);
                            setNameEditFor(null);
                          }}
                          title="Set avatar"
                          style={{
                            background: "none",
                            border: "none",
                            padding: 4,
                            cursor: "pointer",
                            fontSize: 16,
                          }}
                        >
                          {p.avatar || "＋"}
                        </button>
                      </td>
                      <td>
                        <label
                          htmlFor={`photo-input-${p.id}`}
                          title={p.photo ? "Change photo" : "Add a photo"}
                          style={{ display: "inline-flex", cursor: busy ? "default" : "pointer" }}
                        >
                          {p.photo ? (
                            <img
                              src={p.photo}
                              alt=""
                              style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover" }}
                            />
                          ) : (
                            <span style={{ fontSize: 16 }}>📷</span>
                          )}
                        </label>
                        <input
                          id={`photo-input-${p.id}`}
                          type="file"
                          accept="image/*"
                          disabled={busy}
                          style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = "";
                            if (file) pickPhoto(p.id, file);
                          }}
                        />
                        {p.photo && (
                          <button
                            type="button"
                            onClick={() => clearPhoto(p.id)}
                            disabled={busy}
                            title="Remove photo"
                            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "var(--muted)", display: "block", padding: 0 }}
                          >
                            ✕
                          </button>
                        )}
                      </td>
                      <td>
                        <Link to={`/players/${p.id}`} title={p.name} style={{ color: "var(--text-on-surface)", fontWeight: 600 }}>
                          {shortName(p)}
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            if (nameEditFor === p.id) setNameEditFor(null);
                            else startEditName(p);
                            setColorPickerFor(null);
                            setAvatarPickerFor(null);
                          }}
                          title="Fix spelling / rename"
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--muted)", marginLeft: 6 }}
                        >
                          ✎
                        </button>
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
                      <td>
                        <button
                          type="button"
                          onClick={() => handleDelete(p)}
                          disabled={busy}
                          title="Delete permanently"
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "var(--muted)" }}
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                    {pickerOpen && (
                      <tr>
                        <td colSpan={10} style={{ background: "var(--card-white)" }}>
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
                                    border: p.color === c.hex ? "2px solid var(--wood)" : "2px solid transparent",
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
                                  <span style={{ fontSize: 11, color: "var(--muted)" }}>
                                    {takenBy ? `${c.name} (${takenBy.name})` : c.name}
                                  </span>
                                </button>
                              );
                            })}
                            <button
                              type="button"
                              className="btn ghost small"
                              style={{ color: "var(--text-on-surface)", border: "2px solid var(--wood)", alignSelf: "center" }}
                              onClick={() => pickColor(p.id, null)}
                              disabled={busy}
                            >
                              No color
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                    {avatarOpen && (
                      <tr>
                        <td colSpan={10} style={{ background: "var(--card-white)" }}>
                          <div className="chip-row" style={{ padding: "10px 4px" }}>
                            {PLAYER_AVATARS.map((emoji) => (
                              <button
                                type="button"
                                key={emoji}
                                onClick={() => pickAvatar(p.id, emoji)}
                                disabled={busy}
                                style={{
                                  background: "none",
                                  border: p.avatar === emoji ? "2px solid var(--wood)" : "2px solid transparent",
                                  borderRadius: 10,
                                  padding: 6,
                                  fontSize: 20,
                                  cursor: "pointer",
                                }}
                              >
                                {emoji}
                              </button>
                            ))}
                            <button
                              type="button"
                              className="btn ghost small"
                              style={{ color: "var(--text-on-surface)", border: "2px solid var(--wood)", alignSelf: "center" }}
                              onClick={() => pickAvatar(p.id, null)}
                              disabled={busy}
                            >
                              No avatar
                            </button>
                          </div>
                          <div style={{ padding: "0 4px 10px", display: "flex", alignItems: "center", gap: 8 }}>
                            <input
                              type="text"
                              className="input"
                              style={{ maxWidth: 90 }}
                              placeholder="Any emoji…"
                              maxLength={8}
                              disabled={busy}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && e.currentTarget.value.trim()) {
                                  pickAvatar(p.id, e.currentTarget.value.trim());
                                  e.currentTarget.value = "";
                                }
                              }}
                              onBlur={(e) => {
                                if (e.currentTarget.value.trim()) {
                                  pickAvatar(p.id, e.currentTarget.value.trim());
                                  e.currentTarget.value = "";
                                }
                              }}
                            />
                            <span style={{ fontSize: 12, color: "var(--muted)" }}>
                              Tap in, then use your keyboard's emoji button (🌐 / 😀) for any emoji — not just the picks above.
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                    {nameEditOpen && (
                      <tr>
                        <td colSpan={10} style={{ background: "var(--card-white)" }}>
                          <div className="btn-row" style={{ padding: "10px 4px" }}>
                            <input
                              className="input"
                              style={{ flex: 1, minWidth: 120 }}
                              placeholder="First name"
                              value={editFirstName}
                              onChange={(e) => setEditFirstName(e.target.value)}
                              disabled={busy}
                            />
                            <input
                              className="input"
                              style={{ flex: 1, minWidth: 120 }}
                              placeholder="Last name"
                              value={editLastName}
                              onChange={(e) => setEditLastName(e.target.value)}
                              disabled={busy}
                            />
                            <button
                              type="button"
                              className="btn primary small"
                              onClick={() => saveEditName(p.id)}
                              disabled={busy}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="btn ghost small"
                              style={{ color: "var(--text-on-surface)", border: "2px solid var(--wood)" }}
                              onClick={() => setNameEditFor(null)}
                              disabled={busy}
                            >
                              Cancel
                            </button>
                          </div>
                          <p style={{ color: "var(--muted)", fontSize: 12, margin: "0 4px 6px" }}>
                            Past games keep the name they were played under — this only changes
                            how {p.name} shows up going forward.
                          </p>
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
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: -6 }}>
            Drops off this list on its own a few hours after removal — restore before then to
            keep someone on the roster.
          </p>
          <div className="chip-row">
            {inactive.map((p) => (
              <span key={p.id} className="player-chip inactive" style={{ opacity: 1, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span
                  onClick={() => toggleActive(p)}
                  title={`Tap to restore ${p.name} — auto-removes in ${formatTimeLeft(removedPlayerTimeLeftMs(p))}`}
                  style={{ cursor: "pointer" }}
                >
                  {shortName(p)} ↺ <span style={{ fontSize: 11, color: "var(--muted)" }}>({formatTimeLeft(removedPlayerTimeLeftMs(p))})</span>
                </span>
                <span onClick={() => handleDelete(p)} title="Delete permanently now" style={{ cursor: "pointer" }}>
                  🗑
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
