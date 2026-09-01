import { useState } from "react";
import PlayerDot from "./PlayerDot";
import { getRoundDelta } from "../data/rounds";
import { shortName } from "../data/playerNames";

// A list of every round/hand played so far with a delete button on each —
// not just the most recent one. Deleting recomputes totals from the
// remaining rounds (see data/rounds.js).
export default function RoundHistory({ session, rounds, gameType, unitLabel = "Round", onDelete, busy }) {
  const [confirmIdx, setConfirmIdx] = useState(null);

  if (!rounds || rounds.length === 0) return null;

  return (
    <div className="card-surface">
      <h2>{unitLabel} history</h2>
      <table className="score-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Scores</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rounds.map((round, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>
                {session.players.map((p) => {
                  const d = getRoundDelta(gameType, round, p.id, session);
                  return (
                    <span key={p.id} style={{ marginRight: 10, whiteSpace: "nowrap" }}>
                      <PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />
                      {shortName(p)} {d >= 0 ? `+${d}` : d}
                    </span>
                  );
                })}
              </td>
              <td>
                {confirmIdx === i ? (
                  <span className="btn-row">
                    <button
                      type="button"
                      className="btn danger small"
                      disabled={busy}
                      onClick={() => {
                        onDelete(i);
                        setConfirmIdx(null);
                      }}
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      className="btn ghost small"
                      style={{ color: "var(--text-on-surface)", border: "2px solid #6b4226" }}
                      onClick={() => setConfirmIdx(null)}
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn ghost small"
                    style={{ color: "var(--text-on-surface)", border: "2px solid #6b4226" }}
                    disabled={busy}
                    onClick={() => setConfirmIdx(i)}
                  >
                    🗑 Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
