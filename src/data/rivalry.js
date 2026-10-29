// Head-to-head between any two players, across every completed game they
// both sat in. Most games here seat more than two people, so "head-to-head"
// means: when you were both at the table, who won? Four outcomes per game —
//   a: A won and B didn't      b: B won and A didn't
//   both: both won (partners / shared win)   neither: someone else won
import { gameGroupLabel } from "./stats";

function resultFor(session, aId, bId) {
  const winners = session.winnerIds || [];
  const a = winners.includes(aId);
  const b = winners.includes(bId);
  if (a && b) return "both";
  if (a) return "a";
  if (b) return "b";
  return "neither";
}

export function computeRivalry(aId, bId, completedSessions, recentLimit = 8) {
  if (!aId || !bId || aId === bId) return null;
  const shared = (completedSessions || [])
    .filter((s) => {
      const ids = (s.players || []).map((p) => p.id);
      return ids.includes(aId) && ids.includes(bId);
    })
    .map((s) => ({
      sessionId: s.id,
      label: gameGroupLabel(s),
      date: s.completedAt?.toDate?.() || null,
      result: resultFor(s, aId, bId),
    }))
    .sort((x, y) => (x.date?.getTime() || 0) - (y.date?.getTime() || 0)); // oldest first

  const tally = () => ({ games: 0, a: 0, b: 0, both: 0, neither: 0 });
  const total = tally();
  const byLabel = new Map();
  for (const g of shared) {
    const t = byLabel.get(g.label) || tally();
    t.games += 1;
    t[g.result] += 1;
    byLabel.set(g.label, t);
    total.games += 1;
    total[g.result] += 1;
  }
  const byGame = [...byLabel.entries()]
    .map(([label, t]) => ({ label, ...t }))
    .sort((x, y) => y.games - x.games || x.label.localeCompare(y.label));

  const lead = total.a > total.b ? "a" : total.b > total.a ? "b" : "tie";
  return {
    ...total,
    lead,
    byGame,
    recent: shared.slice(-recentLimit).reverse(), // newest first
    firstDate: shared.length ? shared[0].date : null,
  };
}
