import { describe, it, expect } from "vitest";
import { extractUrls, getLinkCardData } from "../../lib/linkPreview";

describe("linkPreview utility", () => {
  it("extracts valid HTTP and HTTPS URLs from text", () => {
    const text = "Check out https://github.com and http://example.org/test for resources!";
    const urls = extractUrls(text);
    expect(urls).toContain("https://github.com");
    expect(urls).toContain("http://example.org/test");
    expect(urls.length).toBe(2);
  });

  it("handles text with no URLs gracefully", () => {
    expect(extractUrls("नमस्ते, यह एक सामान्य विचार है।")).toEqual([]);
    expect(extractUrls("")).toEqual([]);
    expect(extractUrls(null)).toEqual([]);
  });

  it("correctly extracts domain and generates favicon URL", () => {
    const card = getLinkCardData("https://www.nature.com/articles/d41586-024");
    expect(card.domain).toBe("nature.com");
    expect(card.displayUrl).toContain("nature.com");
    expect(card.favicon).toContain("https://www.google.com/s2/favicons?domain=nature.com");
  });
});
