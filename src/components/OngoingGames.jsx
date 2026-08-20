import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { subscribeToInProgressSessions, deleteSession } from "../data/gameSessions";
import { GAME_LABELS } from "../data/stats";

const PLAY_ROUTE = {
  flip7: (id) => `/flip7/play/${id}`,
  "oh-heck": (id) => `/oh-heck/play/${id}`,
  "euchre-2p": (id) => `/euchre/2p/play/${id}`,
  "euchre-3p": (id) => `/euchre/3p/play/${id}`,
  "euchre-traditional": (id) => `/euchre/traditional/play/${id}`,
};

// Euchre 3-player counts DOWN to 0 (lower is better); everything else counts up.
const LOWER_IS_BETTER = new Set(["euchre-3p"]);

const UNIT_LABEL = {
  flip7: "Round",
  "oh-heck": "Round",
  "euchre-2p": "Hand",
  "euchre-3p": "Hand",
  "euchre-traditional": "Hand",
};

// Shows any in-progress game(s) so nothing gets lost when you navigate away
// mid-game. Pass `gameType` to scope it to one game (shown on that game's
// setup screen); omit it to show every ongoing game (shown on Home).
export default function OngoingGames({ gameType }) {
  const [sessions, setSessions] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => subscribeToInProgressSessions(setSessions), []);

  const filtered = sessions
    .filter((s) => !gameType || s.gameType === gameType)
    .filter((s) => PLAY_ROUTE[s.gameType]); // skip game types without a play route (e.g. Other, once added, if unsupported)

  if (filtered.length === 0) return null;

  async function handleQuit(session) {
    const label = GAME_LABELS[session.gameType] || session.gameType;
    if (!window.confirm(`Quit and delete this ${label} game? This can't be undone.`)) return;
    setBusyId(session.id);
    try {
      await deleteSession(session.id);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="card-surface">
      <h2>Ongoing game{filtered.length > 1 ? "s" : ""}</h2>
      {filtered.map((session) => {
        const totals = session.totals || {};
        const label = GAME_LABELS[session.gameType] || session.gameType;
        const unit = UNIT_LABEL[session.gameType] || "Round";
        const sortAsc = LOWER_IS_BETTER.has(session.gameType);
        const ranked = session.players
          .slice()
          .sort((a, b) =>
            sortAsc
              ? (totals[a.id] ?? 0) - (totals[b.id] ?? 0)
              : (totals[b.id] ?? 0) - (totals[a.id] ?? 0)
          );
        return (
          <div key={session.id} style={{ borderTop: "1px solid #eee2c8", paddingTop: 12, marginTop: 12 }}>
            <p style={{ margin: "0 0 6px", fontWeight: 700 }}>
              {label} — {unit} {(session.rounds?.length || 0) + 1}
            </p>
            <p style={{ margin: "0 0 10px", color: "#6f6455" }}>
              {ranked.map((p) => `${p.name}: ${totals[p.id] ?? 0}`).join("  •  ")}
            </p>
            <div className="btn-row">
              <button
                className="btn primary small"
                onClick={() => navigate(PLAY_ROUTE[session.gameType](session.id))}
              >
                Resume
              </button>
              <button
                className="btn danger small"
                onClick={() => handleQuit(session)}
                disabled={busyId === session.id}
              >
                {busyId === session.id ? "Deleting…" : "Quit & delete"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
