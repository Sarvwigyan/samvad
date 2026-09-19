import { describe, it, expect } from "vitest";
import {
  calculateExpireAt,
  calculateEngagement,
  shouldPreserve,
  YEAR_2099_MS,
  TTL_DURATION_MS,
  TTL_DAYS
} from "../../lib/pruning";

describe("Phase 4A: Auto-Pruning & Immortal Preservation (pruning.js)", () => {
  describe("calculateEngagement()", () => {
    it("should calculate canonical engagement weight correctly: likes + replies*2 + reposts*3 + bookmarks*4", () => {
      const post = {
        likeCount: 2,       // 2
        replyCount: 3,      // 3 * 2 = 6
        repostCount: 1,     // 1 * 3 = 3
        bookmarkCount: 1    // 1 * 4 = 4
      };
      // Total = 2 + 6 + 3 + 4 = 15
      expect(calculateEngagement(post)).toBe(15);
    });

    it("should handle missing or undefined fields cleanly as 0", () => {
      expect(calculateEngagement({})).toBe(0);
      expect(calculateEngagement({ likeCount: 5 })).toBe(5);
    });
  });

  describe("shouldPreserve() Immortal Post Rules", () => {
    it("should return false when engagement is exactly 9 (below threshold 10) and no bookmark/repost", () => {
      // 9 likes = 9
      const post = { likeCount: 9, replyCount: 0, repostCount: 0, bookmarkCount: 0 };
      expect(shouldPreserve(post)).toBe(false);
    });

    it("should return true when engagement reaches exactly 10", () => {
      // 10 likes = 10
      const post = { likeCount: 10, replyCount: 0, repostCount: 0, bookmarkCount: 0 };
      expect(shouldPreserve(post)).toBe(true);

      // 4 likes + 3 replies = 4 + 6 = 10
      const postMixed = { likeCount: 4, replyCount: 3, repostCount: 0, bookmarkCount: 0 };
      expect(shouldPreserve(postMixed)).toBe(true);
    });

    it("should return true if post is bookmarked by >= 1 user (even with 0 likes)", () => {
      const post = { likeCount: 0, replyCount: 0, repostCount: 0, bookmarkCount: 1 };
      expect(shouldPreserve(post)).toBe(true);
    });

    it("should return true if post has been reposted >= 1 time", () => {
      const post = { likeCount: 0, replyCount: 0, repostCount: 1, bookmarkCount: 0 };
      expect(shouldPreserve(post)).toBe(true);
    });

    it("should return true if post already has preserve = true or isPinned = true", () => {
      expect(shouldPreserve({ preserve: true })).toBe(true);
      expect(shouldPreserve({ isPinned: true })).toBe(true);
    });
  });

  describe("calculateExpireAt() TTL Policy", () => {
    it("should calculate expireAt as exactly now + 90 days for unpreserved posts", () => {
      const mockNow = 1700000000000;
      const expected = mockNow + (90 * 24 * 60 * 60 * 1000);
      expect(calculateExpireAt(mockNow, false)).toBe(expected);
      expect(TTL_DAYS).toBe(90);
    });

    it("should calculate expireAt as year 2099 (4102444800000) when post is preserved", () => {
      const mockNow = 1700000000000;
      expect(calculateExpireAt(mockNow, true)).toBe(YEAR_2099_MS);
      expect(YEAR_2099_MS).toBe(4102444800000);
    });
  });
});
