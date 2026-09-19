import { describe, it, expect } from "vitest";
import {
  validateUsername,
  validateBio,
  validatePostText,
  USERNAME_REGEX
} from "../../lib/validation";

describe("Validation Rules (validation.js)", () => {
  describe("validateUsername", () => {
    it("accepts valid usernames (3-20 lowercase alphanumeric + underscore)", () => {
      const validCases = ["aryavart", "user_123", "sam_01", "a_b_c", "bharat"];
      for (const username of validCases) {
        const res = validateUsername(username);
        expect(res.valid).toBe(true);
        expect(res.sanitized).toBe(username);
      }
    });

    it("rejects usernames that are too short (< 3 chars)", () => {
      const res = validateUsername("ab");
      expect(res.valid).toBe(false);
      expect(res.error).toBeDefined();
    });

    it("rejects usernames that are too long (> 20 chars)", () => {
      const res = validateUsername("a".repeat(21));
      expect(res.valid).toBe(false);
      expect(res.error).toBeDefined();
    });

    it("rejects invalid characters (spaces, hyphens, uppercase, special chars)", () => {
      const invalidCases = ["User Name", "user-name", "User123", "hello@world", "test!"];
      for (const username of invalidCases) {
        const res = validateUsername(username);
        expect(res.valid).toBe(false);
      }
    });

    it("rejects null, undefined, or empty usernames", () => {
      expect(validateUsername(null).valid).toBe(false);
      expect(validateUsername(undefined).valid).toBe(false);
      expect(validateUsername("").valid).toBe(false);
    });
  });

  describe("validateBio", () => {
    it("accepts empty or valid bios under 160 chars", () => {
      expect(validateBio("").valid).toBe(true);
      expect(validateBio(null).valid).toBe(true);
      expect(validateBio("जिज्ञासु अन्वेषक, भारतीय दर्शन एवं ज्ञान परम्परा").valid).toBe(true);
    });

    it("rejects bios over 160 chars", () => {
      const longBio = "क".repeat(161);
      const res = validateBio(longBio);
      expect(res.valid).toBe(false);
      expect(res.error).toBeDefined();
    });

    it("sanitizes trimming whitespace", () => {
      const res = validateBio("  सत्यमेव जयते  ");
      expect(res.valid).toBe(true);
      expect(res.sanitized).toBe("सत्यमेव जयते");
    });
  });

  describe("validatePostText", () => {
    it("accepts valid post text between 1 and 500 chars", () => {
      const res = validatePostText("एकम् सत् विप्रा बहुधा वदन्ति।");
      expect(res.valid).toBe(true);
      expect(res.sanitized).toBe("एकम् सत् विप्रा बहुधा वदन्ति।");
    });

    it("rejects empty or whitespace-only post text", () => {
      expect(validatePostText("").valid).toBe(false);
      expect(validatePostText("    ").valid).toBe(false);
      expect(validatePostText(null).valid).toBe(false);
    });

    it("rejects post text over 500 characters", () => {
      const res = validatePostText("अ".repeat(501));
      expect(res.valid).toBe(false);
      expect(res.error).toBeDefined();
    });
  });
});
