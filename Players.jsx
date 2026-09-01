import { useEffect, useState } from "react";
import {
  seedDefaultPlayers,
  addPlayer,
  setPlayerActive,
  subscribeToPlayers,
} from "../data/players";

export default function Players() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    seedDefaultPlayers().catch((err) =>
      console.error("Failed to seed default players:", err)
    );
    const unsubscribe = subscribeToPlayers((list) => {
      setPlayers(list);
      setLoading(false);
    });
    return unsubscribe;
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

  const active = players.filter((p) => p.active);
  const inactive = players.filter((p) => !p.active);

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
        <h2>Active players ({active.length})</h2>
        {loading ? (
          <p className="empty-state">Loading…</p>
        ) : active.length === 0 ? (
          <p className="empty-state">No active players yet.</p>
        ) : (
          <div className="chip-row">
            {active.map((p) => (
              <span
                key={p.id}
                className="player-chip"
                onClick={() => toggleActive(p)}
                title="Tap to remove from active roster"
              >
                {p.name} ✕
              </span>
            ))}
          </div>
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
