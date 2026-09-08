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

  const { mostGamesPlayed, mostWins, longestStreakEver, euchreRoyalty, flip7HighScore, tableRegular, rivalry, biggestAchiever } =
    computeHallOfFame(players, sessions);

  return (
    <div>
      <h1 className="page-title">🏆 Hall of Fame</h1>

      {sessions.length === 0 ? (
        <div className="card-surface">
          <p className="empty-state">No games logged yet — finish a game to start filling this in.</p>
        </div>
      ) : (
        <>
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

          <Trophy icon="♦️" title="Euchre Royalty" empty={!euchreRoyalty}>
            {euchreRoyalty && (
              <p style={{ fontSize: 15 }}>
                <Link to={`/players/${euchreRoyalty.player.id}`} style={{ color: "var(--text-on-surface)", fontWeight: 600 }}>
                  <PlayerDot color={euchreRoyalty.player.color} avatar={euchreRoyalty.player.avatar} photo={euchreRoyalty.player.photo} />
                  {shortName(euchreRoyalty.player)}
                </Link>{" "}
                — <strong>{euchreRoyalty.wins}</strong> wins across every Euchre variant combined
              </p>
            )}
          </Trophy>

          <Trophy icon="💥" title="Flip7 High Score" empty={!flip7HighScore}>
            {flip7HighScore && (
              <p style={{ fontSize: 15 }}>
                <Link to={`/players/${flip7HighScore.player.id}`} style={{ color: "var(--text-on-surface)", fontWeight: 600 }}>
                  <PlayerDot color={flip7HighScore.player.color} avatar={flip7HighScore.player.avatar} photo={flip7HighScore.player.photo} />
                  {shortName(flip7HighScore.player)}
                </Link>{" "}
                — <strong>{flip7HighScore.score}</strong> in a single round
                {flip7HighScore.completedAt ? ` (${formatLastPlayed(flip7HighScore.completedAt)})` : ""}
              </p>
            )}
          </Trophy>

          <Trophy icon="🍻" title="Table Regular" empty={!tableRegular}>
            {tableRegular && (
              <p style={{ fontSize: 15 }}>
                <Link to={`/players/${tableRegular.player.id}`} style={{ color: "var(--text-on-surface)", fontWeight: 600 }}>
                  <PlayerDot color={tableRegular.player.color} avatar={tableRegular.player.avatar} photo={tableRegular.player.photo} />
                  {shortName(tableRegular.player)}
                </Link>{" "}
                — played with <strong>{tableRegular.opponentCount}</strong> different people
              </p>
            )}
          </Trophy>

          <Trophy icon="⚔️" title="Rivalry" empty={!rivalry}>
            {rivalry && (
              <p style={{ fontSize: 15 }}>
                <Link to={`/players/${rivalry.playerA.id}`} style={{ color: "var(--text-on-surface)", fontWeight: 600 }}>
                  <PlayerDot color={rivalry.playerA.color} avatar={rivalry.playerA.avatar} photo={rivalry.playerA.photo} />
                  {shortName(rivalry.playerA)}
                </Link>{" "}
                vs{" "}
                <Link to={`/players/${rivalry.playerB.id}`} style={{ color: "var(--text-on-surface)", fontWeight: 600 }}>
                  <PlayerDot color={rivalry.playerB.color} avatar={rivalry.playerB.avatar} photo={rivalry.playerB.photo} />
                  {shortName(rivalry.playerB)}
                </Link>{" "}
                — <strong>{rivalry.gamesTogether}</strong> games together, {rivalry.winsA} wins to {rivalry.winsB}
              </p>
            )}
          </Trophy>

          <Trophy icon="🏆" title="Biggest Achiever" empty={!biggestAchiever}>
            {biggestAchiever && (
              <p style={{ fontSize: 15 }}>
                <Link to={`/players/${biggestAchiever.player.id}`} style={{ color: "var(--text-on-surface)", fontWeight: 600 }}>
                  <PlayerDot color={biggestAchiever.player.color} avatar={biggestAchiever.player.avatar} photo={biggestAchiever.player.photo} />
                  {shortName(biggestAchiever.player)}
                </Link>{" "}
                — <strong>{biggestAchiever.count}</strong> badges unlocked
              </p>
            )}
          </Trophy>
        </>
      )}
    </div>
  );
}
