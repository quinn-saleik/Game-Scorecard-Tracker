import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { subscribeToPlayers } from "../../../data/players";
import { createSession } from "../../../data/gameSessions";
import { buildRoundSequence } from "./ohHeckLogic";
import OngoingGames from "../../../components/OngoingGames";

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
      const sessionPlayers = seatedPlayers.map((p) => ({ id: p.id, name: p.name }));
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

      <div className="card-surface">
        <h2>Select players ({seatedPlayers.length} selected)</h2>
        <p style={{ color: "#6f6455", fontSize: 14, marginTop: -6 }}>
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
                  {p.name}
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
        <p style={{ color: "#6f6455", fontSize: 14 }}>
          Rounds: {roundSequence.join(" → ")} ({roundSequence.length} rounds,
          back to {startingCards} to end).
        </p>
        {deckWarning && (
          <p style={{ color: "#b3352c", fontSize: 14 }}>
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
              style={bidRule !== "traditional" ? { color: "#2b2117", border: "2px solid #6b4226" } : undefined}
              onClick={() => setBidRule("traditional")}
            >
              Traditional
            </button>
            <button
              type="button"
              className={`btn small ${bidRule === "bang-em" ? "primary" : "ghost"}`}
              style={bidRule !== "bang-em" ? { color: "#2b2117", border: "2px solid #6b4226" } : undefined}
              onClick={() => setBidRule("bang-em")}
            >
              Bang 'em
            </button>
          </div>
          <p style={{ color: "#6f6455", fontSize: 13 }}>
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
