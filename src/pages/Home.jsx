import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import OngoingGames from "../components/OngoingGames";
import { subscribeToCustomGames } from "../data/customGames";

const GAMES = [
  { icon: "🂡", label: "Oh Heck!", path: "/oh-heck/setup", soon: false },
  { icon: "🔥", label: "Flip7", path: "/flip7/setup", soon: false },
  { icon: "♣", label: "Euchre", path: "/euchre", soon: false },
  { icon: "♦", label: "Royal Rum", path: "/royal-rum/setup", soon: false },
  { icon: "🎤", label: "Catchphrase", path: "/catchphrase/setup", soon: false },
  { icon: "🂱", label: "31", path: "/thirty-one/setup", soon: false },
  { icon: "♥", label: "Hearts", path: "/hearts/setup", soon: false },
  { icon: "♠", label: "Spades", path: "/spades/setup", soon: false },
  { icon: "⛳", label: "Golf", path: "/golf/setup", soon: false },
];

export default function Home() {
  const [customGames, setCustomGames] = useState([]);

  useEffect(() => subscribeToCustomGames(setCustomGames), []);

  return (
    <div>
      <h1 className="page-title">
        <span className="suit black">♠</span> Pick a game
      </h1>
      <OngoingGames />
      <div className="game-grid">
        {GAMES.map((g) =>
          g.soon ? (
            <div className="game-tile disabled" key={g.label}>
              <span className="icon">{g.icon}</span>
              <span>{g.label}</span>
              <span className="soon">Coming soon</span>
            </div>
          ) : (
            <Link className="game-tile" to={g.path} key={g.label}>
              <span className="icon">{g.icon}</span>
              <span>{g.label}</span>
            </Link>
          )
        )}
        {/* Games someone made up through "Other" — saved so everyone sees
            the same tile with the same rules, instead of re-describing the
            game from scratch every time it comes up. */}
        {customGames.map((g) => (
          <Link className="game-tile" to={`/other/setup/${g.id}`} key={`custom-${g.id}`}>
            <span className="icon">{g.icon || "🃏"}</span>
            <span>{g.name}</span>
          </Link>
        ))}
        <Link className="game-tile" to="/other/setup" key="other-new">
          <span className="icon">➕</span>
          <span>New game</span>
        </Link>
      </div>
    </div>
  );
}
