// "Scorecard Wrapped": a year in review built purely from completed games
// (nothing stored), for one player plus the whole family. Every number is
// derived from the same sessions the Stats page uses, filtered to one
// calendar year (device-local, same as the rest of the app's dates).
import {
  computePlayerStats,
  computeAchievements,
  gameGroupLabel,
  MIN_GAMES_FOR_RATING,
} from "./stats";
import { computeRivalry } from "./rivalry";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function sessionsInYear(sessions, year) {
  return (sessions || []).filter((s) => {
    const d = s.completedAt?.toDate?.();
    return d && d.getFullYear() === year;
  });
}

function dayKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function topEntry(map) {
  let best = null;
  for (const [key, count] of map) {
    if (!best || count > best.count) best = { key, count };
  }
  return best;
}

// Everyone tied for the highest positive value.
function topTied(items, valueOf) {
  let max = 0;
  let out = [];
  for (const item of items) {
    const v = valueOf(item);
    if (!(v > 0)) continue;
    if (v > max) {
      max = v;
      out = [item];
    } else if (v === max) out.push(item);
  }
  return out.length ? { value: max, items: out } : null;
}

// Longest run of consecutive wins within `ys` (any order in, oldest-first inside).
function longestStreak(ys, playerId) {
  const mine = ys
    .filter((s) => (s.players || []).some((p) => p.id === playerId))
    .sort((a, b) => a.completedAt.toDate() - b.completedAt.toDate());
  let best = 0;
  let run = 0;
  for (const s of mine) {
    run = (s.winnerIds || []).includes(playerId) ? run + 1 : 0;
    if (run > best) best = run;
  }
  return best;
}

export function computeWrapped(year, players, allSessions, playerId = null) {
  const ys = sessionsInYear(allSessions, year);
  const byId = new Map((players || []).map((p) => [p.id, p]));
  const hasData = ys.length > 0;

  // ---- family ----
  const gameCounts = new Map();
  const monthCounts = new Map();
  const dayCounts = new Map();
  const participants = new Set();
  for (const s of ys) {
    const label = gameGroupLabel(s);
    gameCounts.set(label, (gameCounts.get(label) || 0) + 1);
    const d = s.completedAt.toDate();
    monthCounts.set(d.getMonth(), (monthCounts.get(d.getMonth()) || 0) + 1);
    const k = dayKey(d);
    const day = dayCounts.get(k) || { count: 0, date: d };
    day.count += 1;
    dayCounts.set(k, day);
    for (const p of s.players || []) participants.add(p.id);
  }
  const topGames = [...gameCounts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 3);
  const busiestMonthE = topEntry(monthCounts);
  let busiestDay = null;
  for (const v of dayCounts.values()) if (!busiestDay || v.count > busiestDay.count) busiestDay = v;

  const stats = computePlayerStats(players || [], ys).filter((s) => s.gamesPlayed > 0);
  const champions = topTied(stats, (s) => s.wins);
  const mostGames = topTied(stats, (s) => s.gamesPlayed);
  const streakers = topTied(stats, (s) => longestStreak(ys, s.playerId));

  // Pair that shared the table most this year.
  const pairCounts = new Map();
  for (const s of ys) {
    const ids = (s.players || []).map((p) => p.id).filter((id) => byId.has(id));
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const key = [ids[i], ids[j]].sort().join("|");
        pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
      }
    }
  }
  const pairTop = topEntry(pairCounts);
  let topPair = null;
  if (pairTop) {
    const [aId, bId] = pairTop.key.split("|");
    const r = computeRivalry(aId, bId, ys);
    topPair = { a: byId.get(aId), b: byId.get(bId), games: pairTop.count, aWins: r.a, bWins: r.b, both: r.both };
  }

  const family = {
    games: ys.length,
    players: participants.size,
    differentGames: gameCounts.size,
    topGames,
    busiestMonth: busiestMonthE ? { name: MONTHS[busiestMonthE.key], count: busiestMonthE.count } : null,
    busiestDay: busiestDay ? { date: busiestDay.date, count: busiestDay.count } : null,
    champions: champions ? { value: champions.value, players: champions.items } : null,
    mostGames: mostGames ? { value: mostGames.value, players: mostGames.items } : null,
    streak: streakers ? { value: streakers.value, players: streakers.items.map((s) => byId.get(s.playerId)).filter(Boolean) } : null,
    topPair,
  };

  // ---- personal ----
  let me = null;
  const mySummary = playerId ? stats.find((s) => s.playerId === playerId) : null;
  if (mySummary) {
    const mine = ys.filter((s) => (s.players || []).some((p) => p.id === playerId));
    const myGames = new Map();
    const myWinsBy = new Map();
    const myMonths = new Map();
    const companions = new Map();
    for (const s of mine) {
      const label = gameGroupLabel(s);
      myGames.set(label, (myGames.get(label) || 0) + 1);
      if ((s.winnerIds || []).includes(playerId)) myWinsBy.set(label, (myWinsBy.get(label) || 0) + 1);
      const m = s.completedAt.toDate().getMonth();
      myMonths.set(m, (myMonths.get(m) || 0) + 1);
      for (const p of s.players || []) {
        if (p.id !== playerId && byId.has(p.id)) companions.set(p.id, (companions.get(p.id) || 0) + 1);
      }
    }
    const fav = topEntry(myGames);
    const bestWins = topEntry(myWinsBy);
    const bestMonth = topEntry(myMonths);
    const comp = topEntry(companions);
    let companion = null;
    if (comp) {
      const r = computeRivalry(playerId, comp.key, ys);
      companion = { player: byId.get(comp.key), games: comp.count, myWins: r.a, theirWins: r.b, both: r.both };
    }
    // Achievements unlocked during the year: held at year's end, not before it.
    const before = (allSessions || []).filter((s) => {
      const d = s.completedAt?.toDate?.();
      return d && d.getFullYear() < year;
    });
    const upTo = (allSessions || []).filter((s) => {
      const d = s.completedAt?.toDate?.();
      return d && d.getFullYear() <= year;
    });
    const had = new Set(computeAchievements(playerId, players, before).filter((b) => b.earned).map((b) => b.id));
    const newBadges = computeAchievements(playerId, players, upTo).filter((b) => b.earned && !had.has(b.id));
    const rank = 1 + stats.filter((s) => s.wins > mySummary.wins).length;

    me = {
      player: byId.get(playerId),
      games: mySummary.gamesPlayed,
      wins: mySummary.wins,
      winPct: mySummary.winPct,
      parPct: mySummary.parPct,
      winIndex: mySummary.gamesPlayed >= MIN_GAMES_FOR_RATING ? mySummary.winIndex : null,
      differentGames: myGames.size,
      favoriteGame: fav ? { label: fav.key, count: fav.count } : null,
      bestGame: bestWins ? { label: bestWins.key, wins: bestWins.count, played: myGames.get(bestWins.key) } : null,
      streak: longestStreak(ys, playerId),
      busiestMonth: bestMonth ? { name: MONTHS[bestMonth.key], count: bestMonth.count } : null,
      companion,
      newBadges: newBadges.map((b) => ({ id: b.id, emoji: b.emoji, label: b.label, description: b.description })),
      winRank: rank,
      rankOf: stats.length,
    };
  }

  return { year, hasData, family, me };
}
