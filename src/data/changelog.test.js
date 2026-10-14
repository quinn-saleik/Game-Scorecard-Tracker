import { describe, it, expect } from "vitest";
import { CHANGELOG, EARLIER, LATEST_CHANGELOG_ID } from "./changelog";

describe("changelog", () => {
  const all = [...CHANGELOG, ...EARLIER];

  it("has unique ids and the dated list is sorted newest first", () => {
    const ids = all.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    const dates = CHANGELOG.map((e) => e.date);
    expect([...dates].sort().reverse()).toEqual(dates);
    expect(LATEST_CHANGELOG_ID).toBe(CHANGELOG[0].id);
  });

  it("every entry has a title, a summary, and at least one item", () => {
    for (const e of all) {
      expect(e.title.length).toBeGreaterThan(0);
      expect(e.summary.length).toBeGreaterThan(0);
      expect(e.items.length).toBeGreaterThan(0);
    }
  });

  it("explains groups with concrete examples", () => {
    const groups = CHANGELOG.find((e) => e.id === "2026-09-groups");
    expect(groups.examples.length).toBeGreaterThanOrEqual(3);
    for (const ex of groups.examples) {
      expect(ex.label && ex.text).toBeTruthy();
    }
  });
});
