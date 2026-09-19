/**
 * Link Preview Detection & Utility for Samwad
 * Scans post text for URLs, extracts metadata safely without CORS issues,
 * and produces rich X-style card data.
 */

// Comprehensive URL regex matching http:// and https:// URLs
const URL_REGEX = /https?:\/\/[^\s<>]+(?:\([\w\d]+\)|([^`~!@#$%^&*()_=+\[\]{};:'",.<>?\s]|\/))/gi;

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
 * Parses a URL and returns clean metadata for X-style card rendering.
 * @param {string} urlString
 * @returns {{ url: string, domain: string, displayUrl: string, favicon: string }}
 */
export function getLinkCardData(urlString) {
  try {
    const parsed = new URL(urlString);
    const domain = parsed.hostname.replace(/^www\./, "");
    const pathname = parsed.pathname === "/" ? "" : parsed.pathname;
    const displayUrl = `${domain}${pathname.length > 25 ? pathname.slice(0, 22) + "..." : pathname}`;
    
    // Google's public favicon service provides reliable 32px favicons without CORS issues
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
