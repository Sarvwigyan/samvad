import { describe, it, expect } from "vitest";
import { vocab, t } from "../../lib/vocab";

describe("Bharatiya Sanskriti Vocabulary (vocab.js)", () => {
  it("should have translations for core social concepts", () => {
    expect(vocab.post).toEqual({ hi: "विचार", en: "Vichar" });
    expect(vocab.like).toEqual({ hi: "अनुमोदन", en: "Anumodan" });
    expect(vocab.profile).toEqual({ hi: "परिचय", en: "Parichay" });
    expect(vocab.follow).toEqual({ hi: "अनुसरण", en: "Anusaran" });
    expect(vocab.followers).toEqual({ hi: "अनुसारी", en: "Anusari" });
    expect(vocab.following).toEqual({ hi: "अनुसरित", en: "Anusarit" });
    expect(vocab.home).toEqual({ hi: "प्रवाह", en: "Pravah" });
    expect(vocab.settings).toEqual({ hi: "व्यवस्था", en: "Vyavastha" });
  });

  it("t() helper should return Hindi by default and English when requested", () => {
    expect(t("post")).toBe("विचार");
    expect(t("post", "hi")).toBe("विचार");
    expect(t("post", "en")).toBe("Vichar");
    expect(t("profile", "en")).toBe("Parichay");
  });

  it("t() helper should fallback gracefully for unknown keys", () => {
    expect(t("unknown_key")).toBe("unknown_key");
  });

  it("must contain ZERO forbidden religious terms (religion, hindu, worship, god, etc.)", () => {
    const forbidden = ["hindu", "religion", "god", "worship", "deity", "pooja", "bhagwan"];
    const allValues = JSON.stringify(vocab).toLowerCase();
    for (const term of forbidden) {
      expect(allValues.includes(term)).toBe(false);
    }
  });
});
