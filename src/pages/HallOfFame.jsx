import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { subscribeToPlayers } from "../data/players";
import { subscribeToCompletedSessions } from "../data/gameSessions";
import { computeHallOfFame } from "../data/stats";
import { useInScope, useSessionFilter } from "../data/favoriteVisibility";
import ScopeToggle from "../components/ScopeToggle";
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

// One player, linked to their page.
// Suffix for a shared record: " each" when more than one player holds it.
const tiedEach = (players) => (players.length > 1 ? " each" : "");

function PlayerLink({ player }) {
  return (
    <Link to={`/players/${player.id}`} style={{ color: "var(--text-on-surface)", fontWeight: 600 }}>
      <PlayerDot color={player.color} avatar={player.avatar} photo={player.photo} />
      {shortName(player)}
    </Link>
  );
}

// "A", "A & B", or "A, B & C" — every player tied for a record is shown.
function PlayerList({ players }) {
  return players.map((p, i) => (
    <span key={p.id}>
      {i > 0 && (i === players.length - 1 ? " & " : ", ")}
      <PlayerLink player={p} />
    </span>
  ));
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

  const sessionInScope = useSessionFilter(players);
  const playerInScope = useInScope(players);

  if (loading) {
    return <p className="empty-state">Loading…</p>;
  }

  const scopedSessions = sessions.filter(sessionInScope);
  // Records only name people in your circle (or everyone, with the switch).
  const scopedPlayers = players.filter((p) => playerInScope(p.id));
  const { mostGamesPlayed, mostWins, longestStreakEver, euchreRoyalty, flip7HighScore, tableRegular, rivalry, biggestAchiever } =
    computeHallOfFame(scopedPlayers, scopedSessions);

  return (
    <div>
      <h1 className="page-title">🏆 Hall of Fame</h1>
      <ScopeToggle players={players} />

      {scopedSessions.length === 0 ? (
        <div className="card-surface">
          <p className="empty-state">
            {sessions.length === 0
              ? "No games logged yet — finish a game to start filling this in."
              : "No games yet among your favorites — finish one to start filling this in."}
          </p>
        </div>
      ) : (
        <>
          <Trophy icon="🃏" title="Most games played" empty={!mostGamesPlayed}>
            {mostGamesPlayed && (
              <p style={{ fontSize: 15 }}>
                <PlayerList players={mostGamesPlayed.players} /> — <strong>{mostGamesPlayed.value}</strong> games
                {tiedEach(mostGamesPlayed.players)}
              </p>
            )}
          </Trophy>

          <Trophy icon="🥇" title="Most wins" empty={!mostWins}>
            {mostWins && (
              <p style={{ fontSize: 15 }}>
                <PlayerList players={mostWins.players} /> — <strong>{mostWins.value}</strong> wins
                {tiedEach(mostWins.players)}
              </p>
            )}
          </Trophy>

          <Trophy icon="🔥" title="Longest win streak ever" empty={!longestStreakEver}>
            {longestStreakEver && (
              <p style={{ fontSize: 15 }}>
                <PlayerList players={longestStreakEver.players} /> — <strong>{longestStreakEver.value}</strong> games in a row
                {tiedEach(longestStreakEver.players)}
              </p>
            )}
          </Trophy>

          <Trophy icon="♦️" title="Euchre Royalty" empty={!euchreRoyalty}>
            {euchreRoyalty && (
              <p style={{ fontSize: 15 }}>
                <PlayerList players={euchreRoyalty.players} /> — <strong>{euchreRoyalty.value}</strong> wins across every Euchre variant combined
                {tiedEach(euchreRoyalty.players)}
              </p>
            )}
          </Trophy>

          <Trophy icon="💥" title="Flip7 High Score" empty={!flip7HighScore}>
            {flip7HighScore && (
              <>
                <p style={{ fontSize: 15, margin: "0 0 6px" }}>
                  <strong>{flip7HighScore.value}</strong> in a single round
                  {flip7HighScore.entries.length > 1 ? " — tied:" : ""}
                </p>
                {flip7HighScore.entries.map((e) => (
                  <p key={e.player.id} style={{ fontSize: 15, margin: "4px 0" }}>
                    <PlayerLink player={e.player} />
                    {e.completedAt ? ` (${formatLastPlayed(e.completedAt)})` : ""}
                  </p>
                ))}
              </>
            )}
          </Trophy>

          <Trophy icon="🍻" title="Table Regular" empty={!tableRegular}>
            {tableRegular && (
              <p style={{ fontSize: 15 }}>
                <PlayerList players={tableRegular.players} /> — played with <strong>{tableRegular.value}</strong> different people
                {tiedEach(tableRegular.players)}
              </p>
            )}
          </Trophy>

          <Trophy icon="⚔️" title="Rivalry" empty={!rivalry}>
            {rivalry &&
              rivalry.pairs.map((r) => (
                <p key={`${r.playerA.id}|${r.playerB.id}`} style={{ fontSize: 15, margin: "4px 0 8px" }}>
                  <PlayerLink player={r.playerA} /> vs <PlayerLink player={r.playerB} /> — <strong>{r.gamesTogether}</strong> games together,{" "}
                  {r.winsA} wins to {r.winsB}
                </p>
              ))}
          </Trophy>

          <Trophy icon="🏆" title="Biggest Achiever" empty={!biggestAchiever}>
            {biggestAchiever && (
              <p style={{ fontSize: 15 }}>
                <PlayerList players={biggestAchiever.players} /> — <strong>{biggestAchiever.value}</strong> badges unlocked
                {tiedEach(biggestAchiever.players)}
              </p>
            )}
          </Trophy>
        </>
      )}
    </div>
  );
}
