import { describe, it, expect } from "vitest";
import { extractMentions } from "../../lib/mentions";

describe("mentions utility", () => {
  it("extracts unique mentioned usernames from text", () => {
    const text = "नमस्ते @arjun_sharma और @krishna_99! फिर से @arjun_sharma से संवाद।";
    const mentions = extractMentions(text);
    expect(mentions).toEqual(["arjun_sharma", "krishna_99"]);
  });

  it("handles text with no mentions gracefully", () => {
    expect(extractMentions("केवल सामान्य वाक्य बिना किसी उल्लेख के")).toEqual([]);
    expect(extractMentions("")).toEqual([]);
    expect(extractMentions(null)).toEqual([]);
  });

  it("ignores handles shorter than 3 characters", () => {
    expect(extractMentions("@ab")).toEqual([]);
  });
});
