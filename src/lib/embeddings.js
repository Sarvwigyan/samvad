import { computeUserInterestVector, cosineSimilarity } from "./ranking";
import { getCloudEmbedding, getCloudEmbeddingBatch } from "./cloudEmbeddings";

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
 * Prioritizes multilingual cloud embeddings (e.g. Cloudflare Workers AI @cf/baai/bge-m3),
 * with seamless fallback to client-side deterministic embedding on network failure or absence.
 * @param {string} text
 * @returns {Promise<Array<number>>}
 */
export async function getPostEmbedding(text = "") {
  const key = text.trim();
  if (!key) return new Array(EMBEDDING_DIM).fill(0);

  if (vectorCache.has(key)) {
    return vectorCache.get(key);
  }

  // 1. Try Cloud AI embeddings first
  const cloudVec = await getCloudEmbedding(key);
  if (Array.isArray(cloudVec) && cloudVec.length > 0) {
    vectorCache.set(key, cloudVec);
    return cloudVec;
  }

  // 2. If USE model is loaded, we can use it, else use high-speed deterministic embedding
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
 * Employs batch cloud retrieval when available to minimize latency.
 * @param {Array<object>} userInteractions - Posts user liked/bookmarked
 * @returns {Promise<Array<number>|null>}
 */
export async function buildUserInterestVector(userInteractions = []) {
  if (!userInteractions || userInteractions.length === 0) {
    return null;
  }

  const neededTexts = [];
  const existingVectors = [];

  for (const post of userInteractions) {
    if (Array.isArray(post?.embedding) && post.embedding.length > 0) {
      existingVectors.push(post.embedding);
    } else if (post?.text) {
      neededTexts.push(post.text.trim());
    }
  }

  let fetchedVectors = [];
  if (neededTexts.length > 0) {
    // Try batch cloud embeddings
    const batchRes = await getCloudEmbeddingBatch(neededTexts);
    if (Array.isArray(batchRes) && batchRes.length === neededTexts.length && batchRes.every(v => Array.isArray(v) && v.length > 0)) {
      neededTexts.forEach((txt, i) => {
        vectorCache.set(txt, batchRes[i]);
      });
      fetchedVectors = batchRes;
    } else {
      fetchedVectors = await Promise.all(neededTexts.map((t) => getPostEmbedding(t)));
    }
  }

  const allVectors = [...existingVectors, ...fetchedVectors].filter((v) => Array.isArray(v) && v.length > 0);
  if (allVectors.length === 0) return null;

  // Group by dimension to ensure vectors of differing dimensions (e.g. 1024 cloud vs 512 local) do not cross-pollute
  const targetDim = allVectors[0].length;
  const uniformVectors = allVectors.filter((v) => v.length === targetDim);

  const uiv = computeUserInterestVector(uniformVectors);
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
