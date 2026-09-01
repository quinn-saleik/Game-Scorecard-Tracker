import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { subscribeToPlayers } from "../../../data/players";
import { createSession } from "../../../data/gameSessions";
import OngoingGames from "../../../components/OngoingGames";
import PlayerDot from "../../../components/PlayerDot";
import GameInstructions from "../../../components/GameInstructions";

export default function ThirtyOneSetup() {
  const [players, setPlayers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [startingLives, setStartingLives] = useState(3);
  const [starting, setStarting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => subscribeToPlayers((list) => setPlayers(list)), []);

  const active = players.filter((p) => p.active);

  function toggle(id) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  const seated = selected.map((id) => active.find((p) => p.id === id)).filter(Boolean);

  async function handleStart() {
    if (seated.length < 2) return;
    setStarting(true);
    try {
      const sessionPlayers = seated.map((p) => ({ id: p.id, name: p.name, color: p.color || null, avatar: p.avatar || null, photo: p.photo || null }));
      const lives = Number(startingLives) || 3;
      const id = await createSession({
        gameType: "thirty-one",
        gameLabel: "31",
        players: sessionPlayers,
        config: { startingLives: lives },
        initialTotals: Object.fromEntries(sessionPlayers.map((p) => [p.id, lives])),
      });
      navigate(`/thirty-one/play/${id}`);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">
        <span className="suit red">🂱</span> 31 — Who's playing?
      </h1>
      <OngoingGames gameType="thirty-one" />

      <GameInstructions players="2+ players">
        <p style={{ margin: "0 0 10px" }}>
          <strong>Objective:</strong> Get your hand as close to 31 as possible in a single suit.
        </p>
        <p style={{ margin: "0 0 10px" }}>
          <strong>How to play:</strong> Each player is dealt 3 cards, with a discard pile
          started from the deck. On your turn, draw from the deck or discard pile and discard
          one card, trying to build the highest total in one suit (aces = 11, face cards = 10,
          others = face value; three of a kind also counts as 31). Any player can knock instead
          of drawing to force one more turn for everyone else before the hand is scored.
        </p>
        <p style={{ margin: 0 }}>
          <strong>Scoring:</strong> After the hand, mark who has the lowest total — they lose a
          life (or everyone tied for lowest loses one). Lives start at your chosen count; hit 0
          and you're eliminated. Last player standing wins.
        </p>
      </GameInstructions>

      <div className="card-surface">
        <h2>Select players ({seated.length})</h2>
        {active.length === 0 ? (
          <p className="empty-state">No active players. Add some on the Players tab first.</p>
        ) : (
          <div className="chip-row">
            {active.map((p) => (
              <span
                key={p.id}
                className={`player-chip ${selected.includes(p.id) ? "selected" : ""}`}
                onClick={() => toggle(p.id)}
              >
                <PlayerDot color={p.color} avatar={p.avatar} photo={p.photo} />
                {p.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="card-surface">
        <h2>Starting lives</h2>
        <div className="field">
          <label htmlFor="lives">Everyone starts with</label>
          <input
            id="lives"
            className="input"
            type="number"
            min="1"
            value={startingLives}
            onChange={(e) => setStartingLives(e.target.value)}
          />
        </div>
      </div>

      <button className="btn primary" disabled={seated.length < 2 || starting} onClick={handleStart}>
        {starting ? "Starting…" : "Start game"}
      </button>
      {seated.length < 2 && <p className="empty-state">Pick at least 2 players to start.</p>}
    </div>
  );
}
