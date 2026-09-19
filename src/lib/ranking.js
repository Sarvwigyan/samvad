import { calculateEngagement } from "./pruning";

/**
 * Normalizes an array of raw numbers to the range [0, 1].
 * If all values are 0 or max <= 0, returns array of 0s.
 * @param {Array<number>} values
 * @returns {Array<number>}
 */
export function normalizeScores(values) {
  if (!values || values.length === 0) return [];
  const max = Math.max(...values);
  if (max <= 0) return values.map(() => 0);
  return values.map((v) => Math.max(0, Math.min(1, v / max)));
}

/**
 * Calculates recency score using canonical Hacker News gravity formula:
 * score = 1 / (hours_old + 2)^1.5
 * Handles future timestamps and negative intervals gracefully.
 * @param {number|Date|object} createdAt
 * @param {number} [now=Date.now()]
 * @returns {number}
 */
export function calculateRecencyScore(createdAt, now = Date.now()) {
  let timeMs = 0;
  if (!createdAt) {
    timeMs = now;
  } else if (typeof createdAt.toDate === "function") {
    timeMs = createdAt.toDate().getTime();
  } else if (createdAt instanceof Date) {
    timeMs = createdAt.getTime();
  } else if (typeof createdAt === "number") {
    timeMs = createdAt;
  } else {
    timeMs = now;
  }

  const hoursOld = Math.max(0, (now - timeMs) / 3600000);
  return 1 / Math.pow(hoursOld + 2, 1.5);
}

/**
 * Calculates cosine similarity between two numeric vectors.
 * Returns 1 for identical, 0 for orthogonal, -1 for opposite.
 * Clamped to [0, 1] for semantic relevance weighting.
 * @param {Array<number>} vecA
 * @param {Array<number>} vecB
 * @returns {number}
 */
export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  const sim = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.max(0, Math.min(1, sim));
}

/**
 * Computes User Interest Vector (UIV) as the element-wise centroid/average
 * of an array of embedding vectors.
 * @param {Array<Array<number>>} vectors
 * @returns {Array<number>|null}
 */
export function computeUserInterestVector(vectors) {
  if (!vectors || vectors.length === 0) return null;
  const validVectors = vectors.filter((v) => Array.isArray(v) && v.length > 0);
  if (validVectors.length === 0) return null;

  const dim = validVectors[0].length;
  const centroid = new Array(dim).fill(0);

  for (const vec of validVectors) {
    if (vec.length !== dim) continue;
    for (let i = 0; i < dim; i++) {
      centroid[i] += vec[i];
    }
  }

  const count = validVectors.length;
  for (let i = 0; i < dim; i++) {
    centroid[i] = Number((centroid[i] / count).toFixed(6));
  }

  return centroid;
}

/**
 * Ranks candidate posts by relevance according to the formula:
 * With UIV:    finalScore = 0.5 * engagement + 0.3 * semantic + 0.2 * recency
 * Cold-Start: finalScore = 0.7 * engagement + 0.3 * recency
 *
 * @param {Array<object>} posts
 * @param {object} [options={}]
 * @param {Array<number>|null} [options.userInterestVector=null]
 * @param {number} [options.now=Date.now()]
 * @returns {Array<object>} Sorted array with rankScore and metrics attached
 */
export function rankPosts(posts = [], options = {}) {
  if (!posts || posts.length === 0) return [];
  if (posts.length === 1) {
    return [{ ...posts[0], rankScore: 1.0, engagementNorm: 1.0, recencyNorm: 1.0, semanticNorm: 0.5 }];
  }

  const { userInterestVector = null, now = Date.now() } = options;
  const hasUiv = Array.isArray(userInterestVector) && userInterestVector.length > 0;

  // 1. Calculate raw component scores
  const rawEngagements = posts.map((p) => calculateEngagement(p));
  const rawRecencies = posts.map((p) => calculateRecencyScore(p.createdAt, now));

  // 2. Normalize components to [0, 1]
  const normEngagements = normalizeScores(rawEngagements);
  const normRecencies = normalizeScores(rawRecencies);

  // 3. Compute final score per post
  const scoredPosts = posts.map((post, idx) => {
    const engagementNorm = normEngagements[idx] ?? 0;
    const recencyNorm = normRecencies[idx] ?? 0;
    let semanticNorm = 0.5; // neutral fallback

    if (hasUiv && Array.isArray(post.embedding)) {
      semanticNorm = cosineSimilarity(userInterestVector, post.embedding);
    }

    let finalScore = 0;
    if (hasUiv) {
      // Full AI Ranking: 50% Engagement, 30% Semantic Relevance, 20% Recency
      finalScore = (0.5 * engagementNorm) + (0.3 * semanticNorm) + (0.2 * recencyNorm);
    } else {
      // Cold-start fallback: 70% Engagement, 30% Recency
      finalScore = (0.7 * engagementNorm) + (0.3 * recencyNorm);
    }

    return {
      ...post,
      rankScore: Number(finalScore.toFixed(4)),
      engagementNorm: Number(engagementNorm.toFixed(3)),
      recencyNorm: Number(recencyNorm.toFixed(3)),
      semanticNorm: Number(semanticNorm.toFixed(3))
    };
  });

  // 4. Sort descending by rankScore
  scoredPosts.sort((a, b) => b.rankScore - a.rankScore);
  return scoredPosts;
}
