// "First name + last initial" — used for scorecards during actual gameplay
// (score entry labels, standings, round/hand history), where everyone at
// the table already knows who's who and full names just take up space.
// Full names still show on the Players page, Setup screens, Stats,
// Hall of Fame, and Recap.
//
// Falls back to splitting a legacy single `name` field (players.js used to
// store one combined name; game-session snapshots still only carry `name`,
// not firstName/lastName) so this works everywhere without needing every
// session snapshot's shape changed.
export function shortName(player) {
  if (!player) return "";
  if (player.firstName) {
    const first = player.firstName.trim();
    const initial = player.lastName ? `${player.lastName.trim().charAt(0).toUpperCase()}.` : "";
    return [first, initial].filter(Boolean).join(" ");
  }
  const parts = (player.name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return parts[0] || "";
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
}
