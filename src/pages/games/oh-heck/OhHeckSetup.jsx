import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { subscribeToPlayers } from "../../../data/players";
import { createSession } from "../../../data/gameSessions";
import { buildRoundSequence } from "./ohHeckLogic";
import OngoingGames from "../../../components/OngoingGames";
import PlayerDot from "../../../components/PlayerDot";
import { shortName } from "../../../data/playerNames";
import GameInstructions from "../../../components/GameInstructions";

const MIN_PLAYERS = 3;

export default function OhHeckSetup() {
  const [players, setPlayers] = useState([]);
  const [selected, setSelected] = useState([]); // preserves tap order = seating order
  const [startingCards, setStartingCards] = useState(8);
  const [bidRule, setBidRule] = useState("traditional");
  const [starting, setStarting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => subscribeToPlayers((list) => setPlayers(list)), []);

  const active = players.filter((p) => p.active);

  function toggle(id) {
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id]
    );
  }

  const seatedPlayers = selected
    .map((id) => active.find((p) => p.id === id))
    .filter(Boolean);

  const roundSequence = buildRoundSequence(Number(startingCards) || 8);
  const deckWarning =
    (Number(startingCards) || 0) * seatedPlayers.length > 52;

  async function handleStart() {
    if (seatedPlayers.length < MIN_PLAYERS) return;
    setStarting(true);
    try {
      const sessionPlayers = seatedPlayers.map((p) => ({ id: p.id, name: p.name, color: p.color || null, avatar: p.avatar || null, photo: p.photo || null }));
      const id = await createSession({
        gameType: "oh-heck",
        gameLabel: "Oh Heck!",
        players: sessionPlayers,
        config: {
          startingCards: Number(startingCards) || 8,
          bidRule,
          roundSequence,
        },
      });
      navigate(`/oh-heck/play/${id}`);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">
        <span className="suit black">🂡</span> Oh Heck! — Who's playing?
      </h1>
      <OngoingGames gameType="oh-heck" />

      <GameInstructions players="3+ players (fewer cards each if you're using one 52-card deck)">
        <p style={{ margin: "0 0 10px" }}>
          <strong>Objective:</strong> Bid exactly how many tricks you'll take each round, then
          hit that number.
        </p>
        <p style={{ margin: "0 0 10px" }}>
          <strong>How to play:</strong> Cards per round step down to 1, then back up to your
          starting count (e.g. 8-7-6…1…6-7-8), with the dealer rotating each round. Starting to
          the dealer's left, everyone bids how many tricks they think they'll win — the dealer
          can be blocked from a bid that would make every bid add up exactly to the cards dealt
          (Traditional rule; turn it off with "Bang 'em" if your house doesn't play that way).
          Play the hand out trick by trick.
        </p>
        <p style={{ margin: 0 }}>
          <strong>Scoring:</strong> Hitting your bid exactly scores bid + 10; missing it (over
          or under) scores only the tricks you actually took. Enter each player's tricks won
          after the hand — the app works out the score. Highest total after the last round wins.
        </p>
      </GameInstructions>

      <div className="card-surface">
        <h2>Select players ({seatedPlayers.length} selected)</h2>
        <p style={{ color: "var(--muted)", fontSize: 14, marginTop: -6 }}>
          Tap in seating order — this sets the first dealer and bid order.
        </p>
        {active.length === 0 ? (
          <p className="empty-state">
            No active players. Add some on the Players tab first.
          </p>
        ) : (
          <div className="chip-row">
            {active.map((p) => {
              const seatNum = selected.indexOf(p.id);
              return (
                <span
                  key={p.id}
                  className={`player-chip ${seatNum > -1 ? "selected" : ""}`}
                  onClick={() => toggle(p.id)}
                >
                  {seatNum > -1 ? `${seatNum + 1}. ` : ""}
                  <PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />
                  {shortName(p)}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div className="card-surface">
        <h2>Config</h2>
        <div className="field">
          <label htmlFor="startingCards">Starting card count</label>
          <input
            id="startingCards"
            className="input"
            type="number"
            min="1"
            max="13"
            value={startingCards}
            onChange={(e) => setStartingCards(e.target.value)}
          />
        </div>
        <p style={{ color: "var(--muted)", fontSize: 14 }}>
          Rounds: {roundSequence.join(" → ")} ({roundSequence.length} rounds,
          back to {startingCards} to end).
        </p>
        {deckWarning && (
          <p style={{ color: "var(--red-suit)", fontSize: 14 }}>
            Heads up: {startingCards} cards × {seatedPlayers.length} players
            is more than a 52-card deck can deal — fine if you're using two
            decks, otherwise lower the starting count.
          </p>
        )}

        <div className="field">
          <label>Bid rule</label>
          <div className="btn-row">
            <button
              type="button"
              className={`btn small ${bidRule === "traditional" ? "primary" : "ghost"}`}
              style={bidRule !== "traditional" ? { color: "var(--text-on-surface)", border: "2px solid var(--wood)" } : undefined}
              onClick={() => setBidRule("traditional")}
            >
              Traditional
            </button>
            <button
              type="button"
              className={`btn small ${bidRule === "bang-em" ? "primary" : "ghost"}`}
              style={bidRule !== "bang-em" ? { color: "var(--text-on-surface)", border: "2px solid var(--wood)" } : undefined}
              onClick={() => setBidRule("bang-em")}
            >
              Bang 'em
            </button>
          </div>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>
            {bidRule === "traditional"
              ? "Dealer can't bid the number that would make total bids exactly equal the cards dealt."
              : "No restriction on the dealer's bid — bids are just labeled over/under/even for reference."}
          </p>
        </div>
      </div>

      <button
        className="btn primary"
        disabled={seatedPlayers.length < MIN_PLAYERS || starting}
        onClick={handleStart}
      >
        {starting ? "Starting…" : "Start game"}
      </button>
      {seatedPlayers.length < MIN_PLAYERS && (
        <p className="empty-state">Pick at least {MIN_PLAYERS} players to start.</p>
      )}
    </div>
  );
}
