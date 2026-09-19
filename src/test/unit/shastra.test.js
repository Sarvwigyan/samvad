import { describe, it, expect } from "vitest";
import { getDailyShloka, getRandomShloka, SHASTRA_CORPUS } from "../../lib/shastra";

describe("shastra utility", () => {
  it("provides authentic corpus with shloka, meaning, and source", () => {
    expect(SHASTRA_CORPUS.length).toBeGreaterThan(5);
    SHASTRA_CORPUS.forEach((item) => {
      expect(item.id).toBeDefined();
      expect(item.shloka).toBeTruthy();
      expect(item.meaning).toBeTruthy();
      expect(item.source).toBeTruthy();
    });
  });

  it("returns daily shloka deterministically", () => {
    const daily = getDailyShloka();
    expect(daily).toBeDefined();
    expect(daily.shloka).toBeTruthy();
    expect(daily.source).toBeTruthy();
  });

  it("returns random shloka different from current when requested", () => {
    const current = SHASTRA_CORPUS[0];
    const random = getRandomShloka(current.id);
    expect(random).toBeDefined();
    expect(random.id).not.toBe(current.id);
  });
});
