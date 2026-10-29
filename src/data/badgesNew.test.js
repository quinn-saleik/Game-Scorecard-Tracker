import { describe, it, expect } from "vitest";
import { computeAchievements } from "./stats";

const ts = (iso) => ({ toDate: () => new Date(iso) });
const players = ["p1", "p2", "p3", "p4"].map((id) => ({ id, name: id }));

let n = 0;
function game({ gameType = "flip7", ids, win, rounds = [], totals = {}, config = {}, at }) {
  n += 1;
  return {
    id: `s${n}`,
    gameType,
    config,
    players: ids.map((id) => ({ id, name: id })),
    winnerIds: win,
    totals,
    rounds,
    completedAt: ts(at),
  };
}
const earned = (id, pid, sessions) =>
  computeAchievements(pid, players, sessions).find((b) => b.id === id).earned;

// "2026-03-01T18:00" + i minutes keeps order and the same Central day.
const t = (day, i = 0) => `2026-03-${String(day).padStart(2, "0")}T18:${String(i).padStart(2, "0")}:00Z`;

describe("win milestones", () => {
  const wins = (k) => Array.from({ length: k }, (_, i) => game({ ids: ["p1", "p2"], win: ["p1"], at: t(1 + (i % 28), i) }));
  it("Dominant at 10, Champion at 25", () => {
    expect(earned("dominant", "p1", wins(9))).toBe(false);
    expect(earned("dominant", "p1", wins(10))).toBe(true);
    expect(earned("champion", "p1", wins(24))).toBe(false);
    expect(earned("champion", "p1", wins(25))).toBe(true);
  });
  it("Specialist at 5 and Master at 15 wins of one game", () => {
    expect(earned("specialist", "p1", wins(5))).toBe(true);
    expect(earned("master", "p1", wins(14))).toBe(false);
    expect(earned("master", "p1", wins(15))).toBe(true);
    const mixed = [...wins(3), ...Array.from({ length: 3 }, (_, i) => game({ gameType: "oh-heck", ids: ["p1", "p2"], win: ["p1"], at: t(20, i) }))];
    expect(earned("specialist", "p1", mixed)).toBe(false);
  });
});

describe("variety and attendance", () => {
  it("Globetrotter needs 10 different games", () => {
    const types = ["flip7", "oh-heck", "euchre-2p", "phase-10", "royal-rum", "golf", "hearts", "nertz", "skip-bo", "catchphrase"];
    const mk = (k) => types.slice(0, k).map((gt, i) => game({ gameType: gt, ids: ["p1", "p2"], win: [], at: t(1 + i) }));
    expect(earned("globetrotter", "p1", mk(9))).toBe(false);
    expect(earned("globetrotter", "p1", mk(10))).toBe(true);
  });
  it("Night Owl: 5 games in one day", () => {
    const day = (k) => Array.from({ length: k }, (_, i) => game({ ids: ["p1", "p2"], win: [], at: t(5, i) }));
    expect(earned("night-owl", "p1", day(4))).toBe(false);
    expect(earned("night-owl", "p1", day(5))).toBe(true);
  });
  it("Loyal: 5 different days in one month", () => {
    const days = (k) => Array.from({ length: k }, (_, i) => game({ ids: ["p1", "p2"], win: [], at: t(2 + i * 3) }));
    expect(earned("loyal", "p1", days(4))).toBe(false);
    expect(earned("loyal", "p1", days(5))).toBe(true);
    // five games on ONE day is not five days
    expect(earned("loyal", "p1", Array.from({ length: 5 }, (_, i) => game({ ids: ["p1", "p2"], win: [], at: t(9, i) })))).toBe(false);
  });
});

describe("rivalry-flavored badges", () => {
  it("Nemesis: 5 straight wins over the same player; a loss resets", () => {
    const beat = (i, day) => game({ ids: ["p1", "p2"], win: ["p1"], at: t(day, i) });
    const lose = (i, day) => game({ ids: ["p1", "p2"], win: ["p2"], at: t(day, i) });
    expect(earned("nemesis", "p1", [beat(0, 1), beat(0, 2), beat(0, 3), beat(0, 4), beat(0, 5)])).toBe(true);
    expect(earned("nemesis", "p1", [beat(0, 1), beat(0, 2), lose(0, 3), beat(0, 4), beat(0, 5)])).toBe(false);
    // a game where a third player wins and neither of you does is neutral
    const neutral = game({ ids: ["p1", "p2", "p3"], win: ["p3"], at: t(3) });
    expect(earned("nemesis", "p1", [beat(0, 1), beat(0, 2), neutral, beat(0, 4), beat(0, 5), beat(0, 6)])).toBe(true);
  });

  it("Streak Breaker: win the game where someone's 3+ streak ends", () => {
    const streak = [1, 2, 3].map((d) => game({ ids: ["p2", "p3"], win: ["p2"], at: t(d) }));
    const breaker = game({ ids: ["p1", "p2"], win: ["p1"], at: t(4) });
    expect(earned("streak-breaker", "p1", [...streak, breaker])).toBe(true);
    const shortStreak = streak.slice(0, 2);
    expect(earned("streak-breaker", "p1", [...shortStreak, breaker])).toBe(false);
    // someone else winning doesn't count for p1
    const other = game({ ids: ["p1", "p2", "p3"], win: ["p3"], at: t(4) });
    expect(earned("streak-breaker", "p1", [...streak, other])).toBe(false);
  });

  it("Underdog: won after being strictly last at the halfway point", () => {
    const r = (a, b, c) => ({ scores: { p1: a, p2: b, p3: c } });
    // p1 trails 0/50/50 after 2 of 4 hands, then wins big
    const comeback = game({ gameType: "flip7", ids: ["p1", "p2", "p3"], win: ["p1"], rounds: [r(0, 30, 20), r(0, 20, 30), r(150, 0, 0), r(100, 0, 0)], at: t(1) });
    expect(earned("underdog", "p1", [comeback])).toBe(true);
    const wireToWire = game({ gameType: "flip7", ids: ["p1", "p2", "p3"], win: ["p1"], rounds: [r(50, 0, 0), r(50, 0, 0), r(50, 0, 0), r(50, 0, 0)], at: t(1) });
    expect(earned("underdog", "p1", [wireToWire])).toBe(false);
    // lower-is-better direction (Golf): "last" means highest total
    const golf = game({ gameType: "golf", ids: ["p1", "p2", "p3"], win: ["p1"], rounds: [r(20, 5, 6), r(20, 5, 6), r(0, 30, 30), r(0, 30, 30)], at: t(2) });
    expect(earned("underdog", "p1", [golf])).toBe(true);
    // too short / too few players don't qualify
    const short = game({ gameType: "flip7", ids: ["p1", "p2", "p3"], win: ["p1"], rounds: [r(0, 30, 20), r(100, 0, 0)], at: t(3) });
    expect(earned("underdog", "p1", [short])).toBe(false);
  });
});

describe("game-specific badges", () => {
  it("Phase Master: completed the phase every hand across 10 hands", () => {
    const hands = (miss) =>
      Array.from({ length: 10 }, (_, i) => ({ roundNumber: i + 1, completed: { p1: i !== miss, p2: false }, points: { p1: 0, p2: 10 } }));
    expect(earned("phase-master", "p1", [game({ gameType: "phase-10", ids: ["p1", "p2"], win: ["p1"], rounds: hands(-1), at: t(1) })])).toBe(true);
    expect(earned("phase-master", "p1", [game({ gameType: "phase-10", ids: ["p1", "p2"], win: ["p1"], rounds: hands(4), at: t(1) })])).toBe(false);
    // a missed hand means 11+ hands, which also fails
    const eleven = [...hands(-1), { roundNumber: 11, completed: { p1: false }, points: { p1: 5, p2: 5 } }];
    expect(earned("phase-master", "p1", [game({ gameType: "phase-10", ids: ["p1", "p2"], win: ["p1"], rounds: eleven, at: t(1) })])).toBe(false);
  });

  it("Dealer's Luck: won a dealer game that you dealt first (seat 1)", () => {
    expect(earned("dealers-luck", "p1", [game({ gameType: "oh-heck", ids: ["p1", "p2"], win: ["p1"], at: t(1) })])).toBe(true);
    expect(earned("dealers-luck", "p2", [game({ gameType: "oh-heck", ids: ["p1", "p2"], win: ["p2"], at: t(1) })])).toBe(false);
    expect(earned("dealers-luck", "p1", [game({ gameType: "flip7", ids: ["p1", "p2"], win: ["p1"], at: t(1) })])).toBe(false);
  });

  it("Sequence Sweep: 3 winner-only wins in a row", () => {
    const wo = (win, d) => game({ gameType: "other", ids: ["p1", "p2"], win, config: { customName: "Sequence", winnerOnly: true }, at: t(d) });
    expect(earned("sequence-sweep", "p1", [wo(["p1"], 1), wo(["p1"], 2), wo(["p1"], 3)])).toBe(true);
    expect(earned("sequence-sweep", "p1", [wo(["p1"], 1), wo(["p2"], 2), wo(["p1"], 3), wo(["p1"], 4)])).toBe(false);
    // scored games in between don't break it
    const scored = game({ gameType: "flip7", ids: ["p1", "p2"], win: ["p2"], at: t(2, 30) });
    expect(earned("sequence-sweep", "p1", [wo(["p1"], 1), scored, wo(["p1"], 3), wo(["p1"], 4)])).toBe(true);
  });
});
