import { describe, it, expect } from "vitest";
import {
  normalizeScores,
  calculateRecencyScore,
  cosineSimilarity,
  computeUserInterestVector,
  rankPosts
} from "../../lib/ranking";

describe("Phase 4B: Relevance Ranking Engine (ranking.js)", () => {
  describe("normalizeScores()", () => {
    it("should normalize an array of numbers to [0, 1]", () => {
      const values = [0, 5, 10];
      const norm = normalizeScores(values);
      expect(norm).toEqual([0, 0.5, 1.0]);
    });

    it("should handle empty or all-zero arrays without div-by-zero", () => {
      expect(normalizeScores([])).toEqual([]);
      expect(normalizeScores([0, 0, 0])).toEqual([0, 0, 0]);
    });
  });

  describe("calculateRecencyScore()", () => {
    it("should return ≈ 0.353 for a brand new post (hours_old = 0)", () => {
      const now = 1700000000000;
      const score = calculateRecencyScore(now, now);
      // 1 / (0 + 2)^1.5 = 1 / 2.8284 ≈ 0.3535
      expect(score).toBeCloseTo(0.3535, 3);
    });

    it("should decay significantly for a 24h old post", () => {
      const now = 1700000000000;
      const postTime = now - (24 * 3600 * 1000);
      const score = calculateRecencyScore(postTime, now);
      // 1 / (24 + 2)^1.5 = 1 / (26^1.5) ≈ 1 / 132.57 ≈ 0.0075
      expect(score).toBeLessThan(0.01);
      expect(score).toBeGreaterThan(0);
    });

    it("should handle future timestamps gracefully (clamping hours_old to 0)", () => {
      const now = 1700000000000;
      const futureTime = now + 100000;
      const score = calculateRecencyScore(futureTime, now);
      expect(score).toBeCloseTo(0.3535, 3);
    });
  });

  describe("cosineSimilarity()", () => {
    it("should return 1.0 for identical vectors", () => {
      const vec = [0.2, 0.5, 0.8];
      expect(cosineSimilarity(vec, vec)).toBeCloseTo(1.0, 4);
    });

    it("should return 0 for orthogonal vectors", () => {
      const vecA = [1, 0, 0];
      const vecB = [0, 1, 0];
      expect(cosineSimilarity(vecA, vecB)).toBe(0);
    });

    it("should handle empty or null vectors gracefully", () => {
      expect(cosineSimilarity(null, [1, 2])).toBe(0);
      expect(cosineSimilarity([1, 2], [])).toBe(0);
    });
  });

  describe("computeUserInterestVector()", () => {
    it("should return the element-wise average of multiple vectors", () => {
      const v1 = [0.2, 0.4];
      const v2 = [0.4, 0.8];
      const centroid = computeUserInterestVector([v1, v2]);
      expect(centroid).toEqual([0.3, 0.6]);
    });

    it("should return null if array is empty or invalid", () => {
      expect(computeUserInterestVector([])).toBeNull();
      expect(computeUserInterestVector(null)).toBeNull();
    });
  });

  describe("rankPosts()", () => {
    it("should return empty array when candidate posts are empty", () => {
      expect(rankPosts([])).toEqual([]);
      expect(rankPosts(null)).toEqual([]);
    });

    it("should assign score 1.0 to a single candidate post", () => {
      const single = [{ id: "p1", text: "संवाद विचार" }];
      const ranked = rankPosts(single);
      expect(ranked).toHaveLength(1);
      expect(ranked[0].rankScore).toBe(1.0);
    });

    it("should correctly rank multiple posts according to engagement and recency (cold start)", () => {
      const now = 1700000000000;
      const pOldHighEngagement = {
        id: "pOld",
        text: "पुराना प्रसिद्ध विचार",
        createdAt: now - (48 * 3600 * 1000),
        likeCount: 50,
        replyCount: 10
      };
      const pNewLowEngagement = {
        id: "pNew",
        text: "नया विचार",
        createdAt: now,
        likeCount: 0,
        replyCount: 0
      };

      const ranked = rankPosts([pOldHighEngagement, pNewLowEngagement], { now });
      expect(ranked).toHaveLength(2);
      expect(ranked[0].rankScore).toBeGreaterThanOrEqual(ranked[1].rankScore);
    });

    it("should boost posts with higher semantic similarity when UIV is provided", () => {
      const now = 1700000000000;
      const uiv = [1, 0, 0]; // User prefers topic X

      const pMatchingTopic = {
        id: "pMatch",
        text: "वेदान्त दर्शन",
        createdAt: now - 3600000,
        likeCount: 5,
        embedding: [0.95, 0.05, 0] // High match
      };

      const pUnrelatedTopic = {
        id: "pOther",
        text: "अन्याय विषय",
        createdAt: now - 3600000,
        likeCount: 5,
        embedding: [0, 0.95, 0.05] // Low match
      };

      const ranked = rankPosts([pUnrelatedTopic, pMatchingTopic], {
        userInterestVector: uiv,
        now
      });

      expect(ranked[0].id).toBe("pMatch");
      expect(ranked[0].semanticNorm).toBeGreaterThan(ranked[1].semanticNorm);
    });
  });
});
