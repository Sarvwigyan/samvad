import { describe, it, expect } from "vitest";
import { vocab } from "../../lib/vocab";
import { validatePostText } from "../../lib/validation";

describe("Phase 4: Kriya (Social Interactions) Unit Tests", () => {
  it("should verify vocabulary mappings for all Phase 4 actions", () => {
    expect(vocab.like).toEqual({ hi: "अनुमोदन", en: "Anumodan" });
    expect(vocab.repost).toEqual({ hi: "प्रसार", en: "Prasar" });
    expect(vocab.reply).toEqual({ hi: "उत्तर", en: "Uttar" });
    expect(vocab.bookmark).toEqual({ hi: "स्मरण", en: "Smaran" });
    expect(vocab.share).toEqual({ hi: "संक्रमण", en: "Sankraman" });
  });

  it("should validate reply text bounds (up to 2100 words)", () => {
    // Valid reply
    const validRes = validatePostText("सादर विचार। पूर्णतः सहमत।");
    expect(validRes.valid).toBe(true);
    expect(validRes.sanitized).toBe("सादर विचार। पूर्णतः सहमत।");

    // Empty reply rejected
    const emptyRes = validatePostText("   ");
    expect(emptyRes.valid).toBe(false);

    // Over length reply rejected (> 2100 words)
    const overLengthRes = validatePostText(Array(2101).fill("उत्तर").join(" "));
    expect(overLengthRes.valid).toBe(false);
  });

  it("should ensure zero religious terms exist in action definitions", () => {
    const actions = [vocab.like, vocab.repost, vocab.reply, vocab.bookmark, vocab.share];
    const forbidden = ["hindu", "religion", "god", "worship", "deity", "pooja"];

    actions.forEach((act) => {
      const serialized = JSON.stringify(act).toLowerCase();
      forbidden.forEach((term) => {
        expect(serialized.includes(term)).toBe(false);
      });
    });
  });
});
