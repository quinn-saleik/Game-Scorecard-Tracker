// "Me" replaces the old Players nav tab: your own stats front and center,
// plus the identity bits that used to live on a shared roster page (name,
// color, avatar, photo, and favorite players). A lightweight "manage
// everyone" admin view is still reachable from here for the rare edit of
// someone else — see the link at the bottom.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  addPlayer,
  setPlayerColor,
  setPlayerAvatar,
  setPlayerPhoto,
  updatePlayerName,
  subscribeToPlayers,
} from "../data/players";
import FavoritesPicker from "../components/FavoritesPicker";
import { subscribeToCompletedSessions } from "../data/gameSessions";
import { subscribeToCustomGames } from "../data/customGames";
import { computePlayerDetail, computeAchievements, MIN_GAMES_FOR_RATING } from "../data/stats";
import { useWhoamiId, setWhoamiId } from "../data/whoami";
import { PLAYER_COLORS } from "../data/playerColors";
import { PLAYER_AVATARS } from "../data/playerAvatars";
import { fileToPlayerPhoto } from "../data/photo";
import PlayerDot from "../components/PlayerDot";
import ParBadge from "../components/ParBadge";
import { formatLastPlayed } from "../data/format";
import { shortName } from "../data/playerNames";

// One of the three big Identity tiles: tap the circle to set/change it,
// "Remove" appears underneath once it's set. The photo tile is a <label>
// for the hidden file input instead of a button.
function IdTile({ label, active, onClick, htmlFor, onRemove, busy, filled, children }) {
  const circleProps = {
    className: `id-circle ${filled ? "filled" : ""} ${active ? "active" : ""}`,
    "aria-label": `${filled ? "Change" : "Set"} ${label.toLowerCase()}`,
  };
  return (
    <div className="id-tile">
      {htmlFor ? (
        <label htmlFor={htmlFor} {...circleProps} style={{ cursor: busy ? "default" : "pointer" }}>{children}</label>
      ) : (
        <button type="button" onClick={onClick} disabled={busy} {...circleProps}>{children}</button>
      )}
      <span className="id-label">{label}</span>
      {onRemove ? (
        <button type="button" className="id-remove" onClick={onRemove} disabled={busy}>Remove</button>
      ) : (
        <span className="id-remove placeholder" aria-hidden="true">&nbsp;</span>
      )}
    </div>
  );
}

export default function Me() {
  const whoamiId = useWhoamiId();
  const [players, setPlayers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [customGames, setCustomGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nameEditing, setNameEditing] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [pickerOpen, setPickerOpen] = useState(null); // "color" | "avatar" | null

  useEffect(() => {
    let playersLoaded = false;
    let sessionsLoaded = false;
    const check = () => { if (playersLoaded && sessionsLoaded) setLoading(false); };
    const unsub1 = subscribeToPlayers((list) => { setPlayers(list); playersLoaded = true; check(); });
    const unsub2 = subscribeToCompletedSessions((list) => { setSessions(list); sessionsLoaded = true; check(); });
    const unsub3 = subscribeToCustomGames(setCustomGames);
    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  if (loading) return <p className="empty-state">Loading…</p>;

  const active = players.filter((p) => p.active);
  const me = players.find((p) => p.id === whoamiId) || null;

  async function handleCreateMe(e) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;
    setBusy(true);
    try {
      const id = await addPlayer(firstName, lastName);
      setWhoamiId(id);
      setFirstName("");
      setLastName("");
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveEditName() {
    setBusy(true);
    try {
      await updatePlayerName(me.id, editFirstName, editLastName);
      setNameEditing(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function pickColor(hex) {
    setBusy(true);
    try {
      await setPlayerColor(me.id, hex);
    } finally {
      setBusy(false);
      setPickerOpen(null);
    }
  }

  async function pickAvatar(emoji) {
    setBusy(true);
    try {
      await setPlayerAvatar(me.id, emoji);
    } finally {
      setBusy(false);
      setPickerOpen(null);
    }
  }

  async function pickPhoto(file) {
    setBusy(true);
    try {
      const dataUrl = await fileToPlayerPhoto(file);
      await setPlayerPhoto(me.id, dataUrl);
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  // ---- No one picked yet: choose from the roster, or add yourself ----
  if (!me) {
    return (
      <div>
        <h1 className="page-title">
          <span className="suit black">♠</span> Me
        </h1>
        <div className="card-surface">
          <h2>Who are you?</h2>
          {active.length === 0 ? (
            <p className="empty-state">No players yet — add yourself below.</p>
          ) : (
            <div className="chip-row">
              {active.map((p) => (
                <span key={p.id} className="player-chip" onClick={() => setWhoamiId(p.id)}>
                  <PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />
                  {shortName(p)}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="card-surface">
          <h2>Not on the list? Add yourself</h2>
          <form onSubmit={handleCreateMe} className="btn-row">
            <input
              className="input"
              style={{ flex: 1, minWidth: 120 }}
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={busy}
            />
            <input
              className="input"
              style={{ flex: 1, minWidth: 120 }}
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={busy}
            />
            <button className="btn primary" type="submit" disabled={busy}>
              Add me
            </button>
          </form>
        </div>
      </div>
    );
  }

  const detail = computePlayerDetail(me.id, players, sessions, customGames);
  const badges = computeAchievements(me.id, players, sessions);

  return (
    <div>
      <h1 className="page-title">
        <PlayerDot color={me.color} avatar={me.avatar} photo={me.photo} />
        {me.name}
      </h1>

      <div className="card-surface">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <h2 style={{ margin: 0 }}>Identity</h2>
          <button
            type="button"
            className="btn ghost small"
            onClick={() => {
              setNameEditing((v) => !v);
              setEditFirstName(me.firstName || me.name?.split(" ")[0] || "");
              setEditLastName(me.lastName || me.name?.split(" ").slice(1).join(" ") || "");
            }}
          >
            ✎ Name
          </button>
        </div>

        <div className="id-tiles">
          <IdTile
            label="Color"
            active={pickerOpen === "color"}
            onClick={() => setPickerOpen(pickerOpen === "color" ? null : "color")}
            onRemove={me.color ? () => pickColor(null) : null}
            busy={busy}
            filled={!!me.color}
          >
            {me.color ? <span className="id-fill" style={{ background: me.color }} /> : <span className="id-empty">🎨</span>}
          </IdTile>
          <IdTile
            label="Avatar"
            active={pickerOpen === "avatar"}
            onClick={() => setPickerOpen(pickerOpen === "avatar" ? null : "avatar")}
            onRemove={me.avatar ? () => pickAvatar(null) : null}
            busy={busy}
            filled={!!me.avatar}
          >
            {me.avatar ? <span className="id-emoji">{me.avatar}</span> : <span className="id-empty">🙂</span>}
          </IdTile>
          <IdTile
            label="Photo"
            htmlFor="me-photo-input"
            onRemove={me.photo ? () => setPlayerPhoto(me.id, null) : null}
            busy={busy}
            filled={!!me.photo}
          >
            {me.photo ? <img src={me.photo} alt="" className="id-photo" /> : <span className="id-empty">📷</span>}
          </IdTile>
          <input
            id="me-photo-input"
            type="file"
            accept="image/*"
            disabled={busy}
            style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) pickPhoto(file);
            }}
          />
        </div>

        {pickerOpen === "color" && (
          <div className="chip-row" style={{ padding: "10px 4px" }}>
            {PLAYER_COLORS.map((c) => {
              const takenBy = active.find((other) => other.id !== me.id && other.color === c.hex);
              return (
                <button
                  type="button"
                  key={c.hex}
                  onClick={() => pickColor(c.hex)}
                  disabled={busy}
                  title={takenBy ? `${c.name} — used by ${takenBy.name}` : c.name}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    background: "none",
                    border: me.color === c.hex ? "2px solid var(--ghost-border)" : "2px solid transparent",
                    borderRadius: 10,
                    padding: 6,
                    cursor: "pointer",
                  }}
                >
                  <span style={{ width: 22, height: 22, borderRadius: "50%", background: c.hex, border: "1px solid rgba(0,0,0,0.15)" }} />
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>{takenBy ? `${c.name} (${shortName(takenBy)})` : c.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {pickerOpen === "avatar" && (
          <div className="chip-row" style={{ padding: "10px 4px" }}>
            {PLAYER_AVATARS.map((emoji) => (
              <button
                type="button"
                key={emoji}
                onClick={() => pickAvatar(emoji)}
                disabled={busy}
                style={{ background: "none", border: me.avatar === emoji ? "2px solid var(--ghost-border)" : "2px solid transparent", borderRadius: 10, padding: 6, fontSize: 20, cursor: "pointer" }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {nameEditing && (
          <div className="btn-row" style={{ padding: "10px 4px" }}>
            <input className="input" style={{ flex: 1, minWidth: 120 }} placeholder="First name" value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} disabled={busy} />
            <input className="input" style={{ flex: 1, minWidth: 120 }} placeholder="Last name" value={editLastName} onChange={(e) => setEditLastName(e.target.value)} disabled={busy} />
            <button type="button" className="btn primary small" onClick={saveEditName} disabled={busy}>Save</button>
            <button type="button" className="btn ghost small" onClick={() => setNameEditing(false)} disabled={busy}>Cancel</button>
          </div>
        )}
      </div>

      <div className="card-surface">
        <h2>Favorites</h2>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: -6 }}>
          Star the people you usually play with. Player pickers, Stats, and the Hall of Fame
          show just you and your favorites. Pick nobody to see everyone, or tap "Everyone" on
          any of those screens for a quick look at the full list.
        </p>
        <FavoritesPicker player={me} players={players} />
      </div>

      <div className="card-surface">
        <h2>Overview</h2>
        <table className="score-table">
          <tbody>
            <tr><td>Games played</td><td>{detail.gamesPlayed}</td></tr>
            <tr>
              <td>Win % <span style={{ color: "var(--muted)", fontSize: 12 }}>(par {detail.parPct}%)</span></td>
              <td>{detail.gamesPlayed ? `${detail.winPct}%` : "—"}</td>
            </tr>
            <tr>
              <td>vs par <span style={{ color: "var(--muted)", fontSize: 12 }}>(1.0× = luck)</span></td>
              <td>{detail.gamesPlayed >= MIN_GAMES_FOR_RATING ? <ParBadge player={detail} /> : `needs ${MIN_GAMES_FOR_RATING}+ games`}</td>
            </tr>
            <tr><td>Most played</td><td>{detail.favoriteGame}</td></tr>
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
          </tbody>
        </table>
      </div>

      <div className="card-surface">
        <h2>By game</h2>
        {detail.gamesByType.length === 0 ? (
          <p className="empty-state">No completed games yet.</p>
        ) : (
          <table className="score-table">
            <thead>
              <tr><th>Game</th><th>Played</th><th>Win %</th><th>Avg score</th><th>Best score</th></tr>
            </thead>
            <tbody>
              {detail.gamesByType.map((g) => (
                <tr key={g.label}>
                  <td style={{ fontWeight: 600 }}>{g.label}</td>
                  <td>{g.gamesPlayed}</td>
                  <td>{g.winPct}%</td>
                  <td>{g.avgScore ?? "—"}</td>
                  <td title={g.bestScoreLabel}>{g.bestScore ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
                border: `2px solid ${b.earned ? "var(--gold, var(--gold))" : "var(--border-soft)"}`,
                opacity: b.earned ? 1 : 0.6,
              }}
            >
              <span style={{ fontSize: 26 }}>{b.emoji}</span>
              <span style={{ fontSize: 12, fontWeight: 700, marginTop: 4 }}>{b.label}</span>
              <span style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{b.description}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="btn-row" style={{ marginTop: 4 }}>
        <button
          type="button"
          className="btn ghost"
          onClick={() => setWhoamiId(null)}
        >
          Not {shortName(me)}? Switch
        </button>
        <Link className="btn ghost" to="/players">
          Manage all players →
        </Link>
      </div>
    </div>
  );
}
