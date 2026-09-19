import { computeUserInterestVector, cosineSimilarity } from "./ranking";

/**
 * In-memory vector cache to prevent repeated computations
 * Map<string, Array<number>>
 */
const vectorCache = new Map();

/**
 * Session-level cached User Interest Vector (UIV)
 */
let sessionUIV = null;
let sessionUIVUid = null;

/**
 * Universal Sentence Encoder model instance (lazy loaded)
 */
let useModel = null;
let isModelLoading = false;

export const EMBEDDING_DIM = 512;

/**
 * Fast deterministic feature hashing embedding (512-dim)
 * Generates an element-normalized 512-dimensional vector based on n-grams and character distributions.
 * Acts as an instant, zero-latency, zero-bundle client-side embedding engine.
 * @param {string} text
 * @returns {Array<number>} 512-dimensional vector
 */
export function generateDeterministicEmbedding(text = "") {
  if (!text) return new Array(EMBEDDING_DIM).fill(0);

  const clean = text.trim().toLowerCase();
  const vector = new Array(EMBEDDING_DIM).fill(0);

  // Hash characters and words into 512 buckets
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i);
    const bucket = (code * 31 + i * 17) % EMBEDDING_DIM;
    vector[bucket] += 1;
  }

  // Word level tokens
  const words = clean.split(/\s+/);
  words.forEach((w, wIdx) => {
    let hash = 0;
    for (let c = 0; c < w.length; c++) {
      hash = (hash * 33 + w.charCodeAt(c)) % EMBEDDING_DIM;
    }
    vector[hash] += 2;
    // Cross n-gram
    if (wIdx > 0) {
      const prevWord = words[wIdx - 1];
      const bigramHash = (hash * 13 + prevWord.length * 7) % EMBEDDING_DIM;
      vector[bigramHash] += 1.5;
    }
  });

  // L2 Normalize
  let norm = 0;
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    norm += vector[i] * vector[i];
  }
  const mag = Math.sqrt(norm) || 1;
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    vector[i] = Number((vector[i] / mag).toFixed(5));
  }

  return vector;
}

/**
 * Retrieves or computes embedding for given text with in-memory caching.
 * @param {string} text
 * @returns {Promise<Array<number>>}
 */
export async function getPostEmbedding(text = "") {
  const key = text.trim();
  if (!key) return new Array(EMBEDDING_DIM).fill(0);

  if (vectorCache.has(key)) {
    return vectorCache.get(key);
  }

  // If USE model is loaded, we can use it, else use high-speed deterministic embedding
  let embedding;
  if (useModel && typeof useModel.embed === "function") {
    try {
      const embeddingsTensor = await useModel.embed([key]);
      const data = await embeddingsTensor.data();
      embedding = Array.from(data);
    } catch (e) {
      embedding = generateDeterministicEmbedding(key);
    }
  } else {
    embedding = generateDeterministicEmbedding(key);
  }

  vectorCache.set(key, embedding);
  return embedding;
}

/**
 * Lazily loads the Universal Sentence Encoder if available
 * @returns {Promise<object|null>}
 */
export async function loadUniversalSentenceEncoder() {
  if (useModel) return useModel;
  if (isModelLoading) return null;

  try {
    isModelLoading = true;
    // Check if USE is loaded on the browser window (e.g., via script tag)
    if (typeof window !== "undefined" && window.use && typeof window.use.load === "function") {
      useModel = await window.use.load();
    }
  } catch (err) {
    // Graceful fallback to high-speed deterministic 512-dim embeddings
  } finally {
    isModelLoading = false;
  }
  return useModel;
}

/**
 * Builds User Interest Vector from liked or bookmarked posts
 * @param {Array<object>} userInteractions - Posts user liked/bookmarked
 * @returns {Promise<Array<number>|null>}
 */
export async function buildUserInterestVector(userInteractions = []) {
  if (!userInteractions || userInteractions.length === 0) {
    return null;
  }

  const embeddingPromises = userInteractions.map(async (post) => {
    if (Array.isArray(post.embedding) && post.embedding.length === EMBEDDING_DIM) {
      return post.embedding;
    }
    return getPostEmbedding(post.text || "");
  });

  const vectors = await Promise.all(embeddingPromises);
  const uiv = computeUserInterestVector(vectors);
  return uiv;
}

/**
 * Gets or caches UIV for current user session
 * @param {string} uid
 * @param {Array<object>} [interactionPosts=[]]
 * @returns {Promise<Array<number>|null>}
 */
export async function getSessionUIV(uid, interactionPosts = []) {
  if (!uid) return null;
  if (sessionUIVUid === uid && sessionUIV) {
    return sessionUIV;
  }

  if (interactionPosts.length > 0) {
    const uiv = await buildUserInterestVector(interactionPosts);
    sessionUIV = uiv;
    sessionUIVUid = uid;
    return uiv;
  }

  return null;
}

/**
 * Clears session vector cache
 */
export function clearVectorCache() {
  vectorCache.clear();
  sessionUIV = null;
  sessionUIVUid = null;
}

export { cosineSimilarity };
