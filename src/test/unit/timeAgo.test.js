import { describe, it, expect } from "vitest";
import { timeAgo } from "../../lib/timeAgo";

describe("Relative Time Formatting (timeAgo.js)", () => {
  it("returns 'just now' for null or undefined timestamps", () => {
    expect(timeAgo(null)).toBe("just now");
    expect(timeAgo(undefined)).toBe("just now");
  });

  it("returns 'just now' for events less than 60 seconds ago", () => {
    const thirtySecsAgo = new Date(Date.now() - 30 * 1000);
    expect(timeAgo(thirtySecsAgo)).toBe("just now");
  });

  it("formats minutes correctly (< 60m)", () => {
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(timeAgo(fiveMinsAgo)).toBe("5m ago");
  });

  it("formats hours correctly (< 24h)", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(timeAgo(threeHoursAgo)).toBe("3h ago");
  });

  it("formats days correctly (< 7d)", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    expect(timeAgo(twoDaysAgo)).toBe("2d ago");
  });

  it("supports Firestore Timestamp objects with toDate()", () => {
    const timestampMock = {
      toDate: () => new Date(Date.now() - 10 * 60 * 1000)
    };
    expect(timeAgo(timestampMock)).toBe("10m ago");
  });
});
