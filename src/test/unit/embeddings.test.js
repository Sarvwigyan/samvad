import { describe, it, expect, beforeEach } from "vitest";
import {
  generateDeterministicEmbedding,
  getPostEmbedding,
  buildUserInterestVector,
  getSessionUIV,
  clearVectorCache,
  EMBEDDING_DIM
} from "../../lib/embeddings";

describe("Phase 4B: Semantic Embeddings & UIV Engine (embeddings.js)", () => {
  beforeEach(() => {
    clearVectorCache();
  });

  describe("generateDeterministicEmbedding()", () => {
    it("should produce a 512-dimensional vector", () => {
      const vec = generateDeterministicEmbedding("सत्यमेव जयते नानृतम्");
      expect(vec).toHaveLength(EMBEDDING_DIM);
      expect(EMBEDDING_DIM).toBe(512);
    });

    it("should generate normalized vectors with magnitude close to 1", () => {
      const vec = generateDeterministicEmbedding("भारतीय ज्ञान परम्परा");
      let sumSq = 0;
      for (const val of vec) sumSq += val * val;
      expect(Math.sqrt(sumSq)).toBeCloseTo(1.0, 2);
    });

    it("should handle empty text gracefully by returning zero vector", () => {
      const vec = generateDeterministicEmbedding("");
      expect(vec).toHaveLength(512);
      expect(vec.every((v) => v === 0)).toBe(true);
    });
  });

  describe("getPostEmbedding() & Vector Caching", () => {
    it("should cache identical text embeddings in memory", async () => {
      const text = "न्याय दर्शन एवं तर्क";
      const vec1 = await getPostEmbedding(text);
      const vec2 = await getPostEmbedding(text);
      expect(vec1).toBe(vec2); // Exact same memory reference from cache
    });
  });

  describe("buildUserInterestVector()", () => {
    it("should return null for empty interactions list", async () => {
      const uiv = await buildUserInterestVector([]);
      expect(uiv).toBeNull();
    });

    it("should compute UIV centroid across liked or bookmarked posts", async () => {
      const likedPosts = [
        { id: "1", text: "उपनिषद् तत्त्वचिन्तन" },
        { id: "2", text: "वेदान्त और योग" }
      ];
      const uiv = await buildUserInterestVector(likedPosts);
      expect(uiv).toHaveLength(512);
      expect(Array.isArray(uiv)).toBe(true);
    });
  });

  describe("getSessionUIV()", () => {
    it("should cache and return session UIV for a user", async () => {
      const posts = [{ id: "1", text: "दैनिक सुभाषित" }];
      const uiv1 = await getSessionUIV("user_123", posts);
      const uiv2 = await getSessionUIV("user_123");
      expect(uiv1).toBe(uiv2);
    });
  });
});
