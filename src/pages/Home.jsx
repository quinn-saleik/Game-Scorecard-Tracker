import { Link } from "react-router-dom";
import OngoingGames from "../components/OngoingGames";

const GAMES = [
  { icon: "🂡", label: "Oh Heck!", path: "/oh-heck/setup", soon: false },
  { icon: "🔥", label: "Flip7", path: "/flip7/setup", soon: false },
  { icon: "♣", label: "Euchre", path: "/euchre", soon: false },
  { icon: "🃏", label: "Other", path: null, soon: true },
];

export default function Home() {
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
      </div>
    </div>
  );
}
