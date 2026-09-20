/**
 * Real-Time Hashtag & Trending Engine for Samwad
 * Dynamically aggregates #hashtags from real posts in Firestore,
 * weighted by actual community engagement (likes, reposts, bookmarks, replies).
 */

// Regex matching Devanagari (\u0900-\u097F) and alphanumeric hashtags
export const HASHTAG_REGEX = /#([a-zA-Z0-9_\u0900-\u097F]+)/gu;

/**
 * Extracts all valid hashtags from a string.
 * @param {string} text
 * @returns {Array<string>} Array of lowercase hashtags including '#' symbol
 */
export function extractHashtags(text = "") {
  if (!text || typeof text !== "string") return [];
  const matches = text.match(HASHTAG_REGEX);
  if (!matches) return [];

  const unique = new Set();
  for (const m of matches) {
    unique.add(m.trim().toLowerCase());
  }
  return Array.from(unique);
}

/**
 * Computes live trending topics strictly from real posts.
 * Zero fake numbers, zero hardcoded topics.
 *
 * @param {Array<object>} posts - List of real Firestore post objects
 * @param {number} maxResults - Maximum topics to return (default: 6)
 * @returns {Array<{ tag: string, count: number, countLabel: string, score: number }>}
 */
export function computeTrendingTopics(posts = [], maxResults = 6) {
  if (!Array.isArray(posts) || posts.length === 0) return [];

  const topicMap = new Map();

  for (const post of posts) {
    if (!post || !post.text) continue;

    const tags = extractHashtags(post.text);
    if (tags.length === 0) continue;

    const likes = post.likeCount || 0;
    const reposts = post.repostCount || 0;
    const bookmarks = post.bookmarkCount || (post.isBookmarked ? 1 : 0);
    const replies = post.replyCount || 0;

    // Engagement formula: Likes (1) + Reposts (2) + Bookmarks (3) + Replies (1.5)
    const engagement = likes * 1 + reposts * 2 + bookmarks * 3 + replies * 1.5;

    for (const tag of tags) {
      if (!topicMap.has(tag)) {
        topicMap.set(tag, {
          tag,
          count: 0,
          engagement: 0
        });
      }
      const item = topicMap.get(tag);
      item.count += 1;
      item.engagement += engagement;
    }
  }

  // Calculate final score: (postCount * 2) + engagement
  const list = Array.from(topicMap.values()).map((t) => {
    const score = t.count * 2 + t.engagement;
    const countLabel = t.count === 1 ? "1 विचार" : `${t.count} विचार`;
    return {
      tag: t.tag,
      count: t.count,
      countLabel,
      score
    };
  });

  // Sort by highest score descending
  list.sort((a, b) => b.score - a.score || b.count - a.count);

  return list.slice(0, maxResults);
}
