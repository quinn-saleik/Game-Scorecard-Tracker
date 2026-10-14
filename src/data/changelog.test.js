import { describe, it, expect } from "vitest";
import { CHANGELOG, LATEST_CHANGELOG_ID } from "./changelog";

describe("changelog", () => {
  it("has unique ids and is sorted newest first", () => {
    const ids = CHANGELOG.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    const dates = CHANGELOG.map((e) => e.date);
    expect([...dates].sort().reverse()).toEqual(dates);
    expect(LATEST_CHANGELOG_ID).toBe(ids[0]);
  });

  it("every entry has a title and at least one item", () => {
    for (const e of CHANGELOG) {
      expect(e.title.length).toBeGreaterThan(0);
      expect(e.items.length).toBeGreaterThan(0);
    }
  });
});
