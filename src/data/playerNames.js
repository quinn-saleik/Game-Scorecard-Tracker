// "First name only" is the default display used everywhere in the app —
// scorecards during gameplay, TV mode, Stats, Hall of Fame, the Players
// roster, Recap. It only grows into "First L." (or more of the last name,
// as far as it takes) when another player the app knows about shares that
// first name, so two "Sarah"s don't both render as bare "Sarah".
//
// To spot a collision, shortName() checks against a live-updated cache of
// every player doc (kept in sync the same way every screen already does
// via subscribeToPlayers), not just whoever happens to be in the current
// game — a family-wide duplicate should disambiguate everywhere, not only
// in the specific session where both people happen to be seated.
//
// Falls back to splitting a legacy single `name` field (players.js used to
// store one combined name; game-session snapshots still only carry `name`,
// not firstName/lastName) so this works everywhere without needing every
// session snapshot's shape changed.
import { subscribeToPlayers } from "./players";

function firstNameOf(player) {
  if (!player) return "";
  if (player.firstName) return player.firstName.trim();
  const parts = (player.name || "").trim().split(/\s+/).filter(Boolean);
  return parts[0] || "";
}

function lastNameOf(player) {
  if (!player) return "";
  if (player.lastName) return player.lastName.trim();
  const parts = (player.name || "").trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

// Most callers pass a real player doc (`.id`), but several pass a
// computePlayerStats()/computePlayerDetail() row instead, which uses
// `.playerId` — same person, different field name. Without normalizing
// this, the self-match check below would never find "itself" in the
// roster for a stats-row caller, append a synthetic duplicate of the same
// person into the collision group, and then "disambiguate" against a
// last name that's identical to its own — growing the abbreviation all
// the way out to the full last name for EVERY player, collision or not.
function idOf(player) {
  return player?.id ?? player?.playerId ?? null;
}

// Pure computation, kept separate from the live-cache wiring below so it's
// unit-testable without touching Firebase: given `player` and the full
// roster of players the app knows about, return the shortest label that
// still tells `player` apart from everyone else sharing their first name.
export function computeShortName(player, allPlayers) {
  if (!player) return "";
  const first = firstNameOf(player);
  if (!first) return "";

  const sameFirst = (allPlayers || []).filter(
    (p) => p && firstNameOf(p).toLowerCase() === first.toLowerCase()
  );
  // Make sure `player` itself is represented even if the roster passed in
  // hasn't caught up yet (a session snapshot's embedded copy, or a
  // just-created player the caller's list hasn't been refreshed with).
  const group = sameFirst.some((p) => idOf(p) === idOf(player))
    ? sameFirst
    : [...sameFirst, player];

  if (group.length <= 1) return first;

  const last = lastNameOf(player);
  if (!last) return first;

  // Grow how many letters of the last name are shown only as far as
  // needed to stay unique within this first-name group — most collisions
  // resolve at a single initial ("Sarah J." vs "Sarah T."), but two
  // people who also share a last initial ("Sarah Johnson" / "Sarah
  // Jones") grow to 2+ letters ("Sarah Jo." vs "Sarah Jon.") until they
  // no longer match, or the full last name is reached.
  const others = group.filter((p) => idOf(p) !== idOf(player) && lastNameOf(p));
  let len = 1;
  while (
    len < last.length &&
    others.some((p) => lastNameOf(p).slice(0, len).toLowerCase() === last.slice(0, len).toLowerCase())
  ) {
    len += 1;
  }
  const abbrev = last.slice(0, len);
  return len >= last.length ? `${first} ${abbrev}` : `${first} ${abbrev}.`;
}

let knownPlayers = [];
try {
  subscribeToPlayers((list) => {
    knownPlayers = list || [];
  });
} catch {
  // Firebase isn't configured in this environment (e.g. a plain unit test
  // importing computeShortName without a real project) — shortName() just
  // falls back to treating every call as if it were the only known player.
}

export function shortName(player) {
  return computeShortName(player, knownPlayers);
}
