import { describe, it, expect } from "vitest";
import { getCircle, visiblePlayers, inScopeFn, sessionInScopeFn, circleSize } from "./favoriteVisibility";

const players = [
  { id: "quinn", name: "Quinn", active: true, favoriteIds: ["mom", "buddy", "gone", "quinn"] },
  { id: "mom", name: "Mom", active: true, favoriteIds: ["quinn"] },
  { id: "buddy", name: "Buddy", active: true },
  { id: "stranger", name: "Stranger", active: true, favoriteIds: [] },
  { id: "gone", name: "Gone", active: false },
];
const ids = (list) => list.map((p) => p.id).sort();

describe("visiblePlayers", () => {
  it("shows everyone active when no whoami is set", () => {
    expect(ids(visiblePlayers(players, null))).toEqual(["buddy", "mom", "quinn", "stranger"]);
  });

  it("shows everyone active when whoami isn't a known player", () => {
    expect(ids(visiblePlayers(players, "nobody"))).toEqual(["buddy", "mom", "quinn", "stranger"]);
  });

  it("shows everyone when your favorites are empty or missing", () => {
    expect(ids(visiblePlayers(players, "stranger"))).toEqual(["buddy", "mom", "quinn", "stranger"]);
    expect(ids(visiblePlayers(players, "buddy"))).toEqual(["buddy", "mom", "quinn", "stranger"]);
  });

  it("filters to you plus your active favorites (ignoring inactive and self)", () => {
    expect(ids(visiblePlayers(players, "quinn"))).toEqual(["buddy", "mom", "quinn"]);
  });

  it("is directional: a favorite doesn't see you unless they favorited you back", () => {
    expect(ids(visiblePlayers(players, "mom"))).toEqual(["mom", "quinn"]);
  });

  it("shows everyone when 'show everyone' is on", () => {
    expect(ids(visiblePlayers(players, "quinn", true))).toEqual(["buddy", "mom", "quinn", "stranger"]);
  });

  it("falls open when every favorite is stale (inactive or deleted)", () => {
    const stale = [
      { id: "a", active: true, favoriteIds: ["gone", "deleted"] },
      { id: "b", active: true },
      { id: "gone", active: false },
    ];
    expect(ids(visiblePlayers(stale, "a"))).toEqual(["a", "b"]);
  });
});

describe("getCircle / circleSize", () => {
  it("returns null when no filter applies", () => {
    expect(getCircle(players, "stranger")).toBeNull();
    expect(circleSize(players, "stranger")).toBe(0);
  });
  it("counts only active favorites, not yourself", () => {
    expect(circleSize(players, "quinn")).toBe(2);
  });
});

describe("inScopeFn", () => {
  it("scopes player rows to the circle, unless show-everyone", () => {
    const inScope = inScopeFn(players, "quinn");
    expect(inScope("mom")).toBe(true);
    expect(inScope("stranger")).toBe(false);
    expect(inScopeFn(players, "quinn", true)("stranger")).toBe(true);
  });
});

describe("sessionInScopeFn", () => {
  const withMom = { players: [{ id: "mom" }, { id: "stranger" }] };
  const strangers = { players: [{ id: "stranger" }] };
  it("keeps games where you or a favorite played", () => {
    const f = sessionInScopeFn(players, "quinn");
    expect(f(withMom)).toBe(true);
    expect(f(strangers)).toBe(false);
    expect(f({ players: [{ id: "quinn" }] })).toBe(true);
  });
  it("keeps everything when no filter applies or show-everyone is on", () => {
    expect(sessionInScopeFn(players, null)(strangers)).toBe(true);
    expect(sessionInScopeFn(players, "quinn", true)(strangers)).toBe(true);
  });
});
