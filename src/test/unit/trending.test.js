import { describe, it, expect } from "vitest";
import { extractHashtags, computeTrendingTopics } from "../../lib/trending";

describe("Real-Time Trending Engine (trending.js)", () => {
  it("should extract English and Devanagari hashtags accurately", () => {
    const text = "श्रीरामचरितमानस (बालकाण्ड) #बालकाण्ड और #संवाद मंच पर #samvad_2026";
    const tags = extractHashtags(text);
    expect(tags).toContain("#बालकाण्ड");
    expect(tags).toContain("#संवाद");
    expect(tags).toContain("#samvad_2026");
  });

  it("should return empty array when no hashtags present", () => {
    expect(extractHashtags("कोई हैशटैग नहीं है यहाँ।")).toEqual([]);
    expect(extractHashtags("")).toEqual([]);
    expect(extractHashtags(null)).toEqual([]);
  });

  it("should compute trending list from real posts and rank by engagement", () => {
    const posts = [
      { id: "1", text: "प्रथम विचार #बालकाण्ड", likeCount: 5, repostCount: 2 },
      { id: "2", text: "द्वितीय विचार #बालकाण्ड", likeCount: 1, repostCount: 0 },
      { id: "3", text: "तीसरा विचार #वेदान्त", likeCount: 20, repostCount: 5 }
    ];

    const trending = computeTrendingTopics(posts);
    expect(trending.length).toBe(2);

    // #वेदान्त has 1 post but high engagement (20 + 10 = 30) -> score = 2 + 30 = 32
    // #बालकाण्ड has 2 posts and lower engagement (9) -> score = 4 + 9 = 13
    expect(trending[0].tag).toBe("#वेदान्त");
    expect(trending[0].countLabel).toBe("1 विचार");
    expect(trending[1].tag).toBe("#बालकाण्ड");
    expect(trending[1].countLabel).toBe("2 विचार");
  });

  it("should return empty list when no posts have hashtags", () => {
    const posts = [
      { id: "1", text: "सामान्य विचार" },
      { id: "2", text: "अन्य विचार" }
    ];
    expect(computeTrendingTopics(posts)).toEqual([]);
  });
});
