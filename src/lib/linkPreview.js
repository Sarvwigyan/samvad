/**
 * Link Preview & Open-Graph Utility for Samwad
 * Scans post text for URLs, extracts rich metadata safely without CORS issues,
 * and produces rich X-style card data (og:title, og:image, og:description, domain).
 */

// Comprehensive URL regex matching http:// and https:// URLs
const URL_REGEX = /https?:\/\/[^\s<>]+(?:\([\w\d]+\)|([^`~!@#$%^&*()_=+\[\]{};:'",.<>?\s]|\/))/gi;

const OG_CACHE = new Map();

/**
 * Extracts all URLs found in the text.
 * @param {string} text
 * @returns {string[]}
 */
export function extractUrls(text = "") {
  if (!text || typeof text !== "string") return [];
  const matches = text.match(URL_REGEX);
  return matches ? Array.from(new Set(matches)) : [];
}

/**
 * Parses a URL and returns clean base metadata for X-style card rendering.
 * @param {string} urlString
 * @returns {{ url: string, domain: string, displayUrl: string, favicon: string }}
 */
export function getLinkCardData(urlString) {
  try {
    const parsed = new URL(urlString);
    const domain = parsed.hostname.replace(/^www\./, "");
    const pathname = parsed.pathname === "/" ? "" : parsed.pathname;
    const displayUrl = `${domain}${pathname.length > 25 ? pathname.slice(0, 22) + "..." : pathname}`;
    const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

    return {
      url: urlString,
      domain,
      displayUrl,
      favicon
    };
  } catch (e) {
    return {
      url: urlString,
      domain: urlString.replace(/^https?:\/\//, "").split("/")[0],
      displayUrl: urlString,
      favicon: ""
    };
  }
}

/**
 * Fetches Open-Graph metadata (title, image, description, publisher) for a URL.
 * Uses a free client-side proxy (Microlink) with fallback to base URL metadata.
 * Results are cached in-memory.
 *
 * @param {string} urlString
 * @returns {Promise<{ url: string, domain: string, displayUrl: string, favicon: string, title?: string, description?: string, image?: string, publisher?: string }>}
 */
export async function fetchOpenGraphData(urlString) {
  if (!urlString || typeof urlString !== "string") return null;

  const baseData = getLinkCardData(urlString);
  if (OG_CACHE.has(urlString)) {
    return OG_CACHE.get(urlString);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const endpoint = `https://api.microlink.io?url=${encodeURIComponent(urlString)}`;
    const res = await fetch(endpoint, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      if (json.status === "success" && json.data) {
        const d = json.data;
        const richData = {
          url: urlString,
          domain: baseData.domain,
          displayUrl: baseData.displayUrl,
          favicon: d.logo?.url || baseData.favicon,
          title: d.title ? String(d.title).slice(0, 160) : "",
          description: d.description ? String(d.description).slice(0, 260) : "",
          image: d.image?.url || "",
          publisher: d.publisher || baseData.domain
        };
        OG_CACHE.set(urlString, richData);
        return richData;
      }
    }
  } catch (e) {
    // Timeout or network error, gracefully fallback
  }

  OG_CACHE.set(urlString, baseData);
  return baseData;
}
