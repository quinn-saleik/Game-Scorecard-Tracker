import { describe, it, expect } from "vitest";
import { visiblePlayers } from "./groupVisibility";

const players = [
  { id: "quinn", name: "Quinn", active: true, groupIds: ["family", "friends"] },
  { id: "mom", name: "Mom", active: true, groupIds: ["family"] },
  { id: "buddy", name: "Buddy", active: true, groupIds: ["friends"] },
  { id: "stranger", name: "Stranger", active: true, groupIds: ["other-group"] },
  { id: "gone", name: "Gone", active: false, groupIds: ["family"] },
];

describe("visiblePlayers", () => {
  it("shows everyone active when no whoami is set", () => {
    const result = visiblePlayers(players, null);
    expect(result.map((p) => p.id).sort()).toEqual(["buddy", "mom", "quinn", "stranger"]);
  });

  it("shows everyone active when your player has no groups yet", () => {
    const soloPlayers = [{ id: "solo", name: "Solo", active: true, groupIds: [] }, ...players];
    const result = visiblePlayers(soloPlayers, "solo");
    expect(result.length).toBe(soloPlayers.filter((p) => p.active).length);
  });

  it("filters to players sharing at least one of your groups, plus you", () => {
    const result = visiblePlayers(players, "quinn");
    // Quinn is in both family and friends, so sees both groups' members.
    expect(result.map((p) => p.id).sort()).toEqual(["buddy", "mom", "quinn"]);
  });

  it("someone in only one group sees only that group's players", () => {
    const result = visiblePlayers(players, "mom");
    expect(result.map((p) => p.id).sort()).toEqual(["mom", "quinn"]);
  });

  it("never surfaces inactive (removed) players even if they share a group", () => {
    const result = visiblePlayers(players, "mom");
    expect(result.some((p) => p.id === "gone")).toBe(false);
  });
});
