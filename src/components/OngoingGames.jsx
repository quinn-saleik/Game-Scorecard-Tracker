import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { subscribeToInProgressSessions, deleteSession } from "../data/gameSessions";
import { GAME_LABELS } from "../data/stats";
import { PLAY_ROUTE } from "../data/gameRoutes";
import PlayerDot from "./PlayerDot";
import { shortName } from "../data/playerNames";

// Euchre 3-player, Royal Rum, and Hearts count DOWN (lower is better);
// Golf and "Other" games decide their own direction per session (Golf is
// always down; "Other" reads config.scoreDirection — see the sortAsc
// calculation below); everything else — including "31" lives, where more
// is safer — counts up.
const LOWER_IS_BETTER = new Set(["euchre-3p", "royal-rum", "hearts", "golf"]);

const UNIT_LABEL = {
  flip7: "Round",
  "oh-heck": "Round",
  "euchre-2p": "Hand",
  "euchre-3p": "Hand",
  "euchre-traditional": "Hand",
  "euchre-15card": "Hand",
  "euchre-partner": "Hand",
  catchphrase: "Round",
  "thirty-one": "Round",
  "royal-rum": "Hand",
  other: "Round",
  hearts: "Hand",
  golf: "Hole",
  spades: "Hand",
};

function slug(s) {
  return (s || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

// Shows any in-progress game(s) so nothing gets lost when you navigate away
// mid-game. Pass `gameType` to scope it to one game (shown on that game's
// setup screen); for "Other", also pass `customName` to scope it to that
// one custom game specifically — otherwise every in-progress "Other" game
// (Poker, Yahtzee, whatever else) would show up on each other's screen.
// Omit both to show every ongoing game (shown on Home).
export default function OngoingGames({ gameType, customName }) {
  const [sessions, setSessions] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => subscribeToInProgressSessions(setSessions), []);

  const filtered = sessions
    .filter((s) => !gameType || s.gameType === gameType)
    .filter((s) => !customName || slug(s.config?.customName) === slug(customName))
    .filter((s) => PLAY_ROUTE[s.gameType]); // skip game types without a play route (e.g. a removed game's leftover session)

  if (filtered.length === 0) return null;

  function labelFor(session) {
    if (session.gameType === "other") return session.config?.customName || "Other";
    return GAME_LABELS[session.gameType] || session.gameType;
  }

  async function handleQuit(session) {
    const label = labelFor(session);
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
        const label = labelFor(session);
        const unit = UNIT_LABEL[session.gameType] || "Round";
        const sortAsc =
          LOWER_IS_BETTER.has(session.gameType) ||
          (session.gameType === "other" && session.config?.scoreDirection === "down");
        const ranked = session.players
          .slice()
          .sort((a, b) =>
            sortAsc
              ? (totals[a.id] ?? 0) - (totals[b.id] ?? 0)
              : (totals[b.id] ?? 0) - (totals[a.id] ?? 0)
          );
        return (
          <div key={session.id} style={{ borderTop: "1px solid var(--divider)", paddingTop: 12, marginTop: 12 }}>
            <p style={{ margin: "0 0 6px", fontWeight: 700 }}>
              {label} — {unit} {(session.rounds?.length || 0) + 1}
            </p>
            <p style={{ margin: "0 0 10px", color: "var(--muted)" }}>
              {ranked.map((p, i) => (
                <span key={p.id}>
                  {i > 0 && "  •  "}
                  <PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />{shortName(p)}: {totals[p.id] ?? 0}
                </span>
              ))}
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
