// "vs par" value, e.g. ▲ 1.7× (green) or ▼ 0.9× (red). 1.0× and up is at or
// above par. The arrow carries the same meaning as the color so it still
// reads for color-blind players. Blank until MIN_GAMES_FOR_RATING games.
import { MIN_GAMES_FOR_RATING } from "../data/stats";

export default function ParBadge({ player }) {
  if (player.gamesPlayed < MIN_GAMES_FOR_RATING || player.winIndex === null) return "—";
  const good = player.winIndex >= 1;
  return (
    <span className={good ? "par-good" : "par-bad"}>
      {good ? "▲" : "▼"} {player.winIndex.toFixed(1)}×
    </span>
  );
}
