import { useEffect, useMemo, useState } from "react";
import { subscribeToPlayers } from "../data/players";
import { subscribeToCompletedSessions } from "../data/gameSessions";
import { computeAchievements } from "../data/stats";
import { shortName } from "../data/playerNames";

// Unlinked admin view (#/badges-audit): every achievement, who has earned it,
// and which ones nobody has. Handy for deciding which badges to keep, tune or
// retire. Same live data as the rest of the app — nothing is written.

export default function BadgeAudit() {
  const [players, setPlayers] = useState(null);
  const [sessions, setSessions] = useState(null);

  useEffect(() => {
    const u1 = subscribeToPlayers(setPlayers);
    const u2 = subscribeToCompletedSessions(setSessions);
    return () => {
      u1();
      u2();
    };
  }, []);

  const rows = useMemo(() => {
    if (!players || !sessions) return null;
    const byBadge = new Map();
    for (const p of players) {
      for (const b of computeAchievements(p.id, players, sessions)) {
        const row = byBadge.get(b.id) || { ...b, earnedBy: [] };
        if (b.earned) row.earnedBy.push(p);
        byBadge.set(b.id, row);
      }
    }
    return [...byBadge.values()];
  }, [players, sessions]);

  if (!rows) return <p className="empty-state">Loading…</p>;

  const nobody = rows.filter((r) => r.earnedBy.length === 0);
  const some = rows.filter((r) => r.earnedBy.length > 0).sort((a, b) => a.earnedBy.length - b.earnedBy.length);

  return (
    <div>
      <h1 className="page-title">🏅 Badge audit</h1>
      <p style={{ color: "var(--muted)", fontSize: 14 }}>
        {rows.length} badges · {players.length} players · {sessions.length} completed games. Inactive players are included.
      </p>

      <div className="card-surface">
        <h2>Nobody has earned ({nobody.length})</h2>
        {nobody.length === 0 ? (
          <p style={{ margin: 0 }}>Every badge has been earned by someone.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {nobody.map((r) => (
              <li key={r.id} style={{ marginBottom: 6 }}>
                {r.emoji} <strong>{r.label}</strong> — {r.description}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card-surface">
        <h2>Earned ({some.length}) — rarest first</h2>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {some.map((r) => (
            <li key={r.id} style={{ marginBottom: 6 }}>
              {r.emoji} <strong>{r.label}</strong> — {r.description}
              <br />
              <span style={{ color: "var(--muted)", fontSize: 13 }}>
                {r.earnedBy.length}/{players.length}: {r.earnedBy.map((p) => shortName(p)).join(", ")}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
