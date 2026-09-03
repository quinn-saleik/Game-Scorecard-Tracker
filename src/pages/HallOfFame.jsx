import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { subscribeToPlayers } from "../data/players";
import { subscribeToCompletedSessions } from "../data/gameSessions";
import { computeHallOfFame } from "../data/stats";
import PlayerDot from "../components/PlayerDot";
import { formatLastPlayed } from "../data/format";
import { shortName } from "../data/playerNames";

function Trophy({ icon, title, empty, children }) {
  return (
    <div className="card-surface">
      <h2>
        {icon} {title}
      </h2>
      {empty ? <p className="empty-state">Not enough games played yet.</p> : children}
    </div>
  );
}

export default function HallOfFame() {
  const [players, setPlayers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

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
    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  if (loading) {
    return <p className="empty-state">Loading…</p>;
  }

  const { biggestScore, mostGamesPlayed, mostWins, longestStreakEver } = computeHallOfFame(
    players,
    sessions
  );

  return (
    <div>
      <h1 className="page-title">🏆 Hall of Fame</h1>

      {sessions.length === 0 ? (
        <div className="card-surface">
          <p className="empty-state">No games logged yet — finish a game to start filling this in.</p>
        </div>
      ) : (
        <>
          <Trophy icon="💥" title="Biggest score ever" empty={!biggestScore}>
            {biggestScore && (
              <p style={{ fontSize: 15 }}>
                <Link to={`/players/${biggestScore.player.id}`} style={{ color: "var(--text-on-surface)", fontWeight: 600 }}>
                  <PlayerDot color={biggestScore.player.color} avatar={biggestScore.player.avatar} photo={biggestScore.player.photo} />
                  {shortName(biggestScore.player)}
                </Link>{" "}
                — <strong>{biggestScore.score}</strong> in {biggestScore.gameLabel}
                {biggestScore.completedAt ? ` (${formatLastPlayed(biggestScore.completedAt)})` : ""}
              </p>
            )}
          </Trophy>

          <Trophy icon="🃏" title="Most games played" empty={!mostGamesPlayed}>
            {mostGamesPlayed && (
              <p style={{ fontSize: 15 }}>
                <Link to={`/players/${mostGamesPlayed.playerId}`} style={{ color: "var(--text-on-surface)", fontWeight: 600 }}>
                  <PlayerDot color={mostGamesPlayed.color} avatar={mostGamesPlayed.avatar} photo={mostGamesPlayed.photo} />
                  {shortName(mostGamesPlayed)}
                </Link>{" "}
                — <strong>{mostGamesPlayed.gamesPlayed}</strong> games
              </p>
            )}
          </Trophy>

          <Trophy icon="🥇" title="Most wins" empty={!mostWins}>
            {mostWins && (
              <p style={{ fontSize: 15 }}>
                <Link to={`/players/${mostWins.playerId}`} style={{ color: "var(--text-on-surface)", fontWeight: 600 }}>
                  <PlayerDot color={mostWins.color} avatar={mostWins.avatar} photo={mostWins.photo} />
                  {shortName(mostWins)}
                </Link>{" "}
                — <strong>{mostWins.wins}</strong> wins
              </p>
            )}
          </Trophy>

          <Trophy icon="🔥" title="Longest win streak ever" empty={!longestStreakEver}>
            {longestStreakEver && (
              <p style={{ fontSize: 15 }}>
                <Link to={`/players/${longestStreakEver.player.id}`} style={{ color: "var(--text-on-surface)", fontWeight: 600 }}>
                  <PlayerDot color={longestStreakEver.player.color} avatar={longestStreakEver.player.avatar} photo={longestStreakEver.player.photo} />
                  {shortName(longestStreakEver.player)}
                </Link>{" "}
                — <strong>{longestStreakEver.streak}</strong> games in a row
              </p>
            )}
          </Trophy>
        </>
      )}
    </div>
  );
}
