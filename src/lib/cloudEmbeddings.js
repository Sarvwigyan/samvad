/**
 * Cloud AI Multilingual Embeddings Client (Cloudflare Workers AI @cf/baai/bge-m3)
 * Provides 1024-dimensional semantic embeddings for Hindi, Sanskrit, and English.
 * Gracefully falls back to null if no endpoint is configured or if network fails.
 */

const CLOUD_EMBED_URL = import.meta.env?.VITE_EMBED_WORKER_URL;
const cache = new Map();

/**
 * Retrieves a single cloud embedding vector with memory caching
 * @param {string} text
 * @returns {Promise<Array<number>|null>} 1024-dim vector or null
 */
export async function getCloudEmbedding(text) {
  if (!CLOUD_EMBED_URL || !text) return null;
  const key = text.slice(0, 200);
  if (cache.has(key)) return cache.get(key);

  try {
    const res = await fetch(CLOUD_EMBED_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts: [text] })
    });
    if (!res.ok) return null;
    const json = await res.json();
    const vec = json.embeddings?.[0];
    if (Array.isArray(vec) && vec.length > 0) {
      cache.set(key, vec);
      return vec;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Retrieves a batch of cloud embeddings
 * @param {Array<string>} texts
 * @returns {Promise<Array<Array<number>>>}
 */
export async function getCloudEmbeddingBatch(texts) {
  if (!CLOUD_EMBED_URL || !texts?.length) return [];
  try {
    const res = await fetch(CLOUD_EMBED_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts })
    });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json.embeddings) ? json.embeddings : [];
  } catch {
    return [];
  }
}
