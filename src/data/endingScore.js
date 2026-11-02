// Plain-language line for a custom game's ending score. Whether the game ends
// when scores climb UP to the number or drop DOWN to it depends on where
// everyone starts (matches OtherPlay), NOT on who wins — Sky-Jo counts up from
// 0 and ends at 100, yet the lowest score wins.
export function endingScoreText(direction, startingScore, target) {
  const t = String(target ?? "").trim();
  if (t === "") return null;
  const start = Number(startingScore) || 0;
  const climbs = start < Number(t);
  const when = climbs ? `reaches ${t}` : `drops to ${t} or below`;
  const who = direction === "down" ? "Lowest" : "Highest";
  return `The game ends once someone's total ${when} — ${who.toLowerCase()} score wins.`;
}
