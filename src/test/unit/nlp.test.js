import { describe, it, expect } from "vitest";
import { classifyVichar, BHAV_CATEGORIES } from "../../lib/nlp";

describe("Smart NLP Classification Engine (nlp.js)", () => {
  it("should classify questions with question marks as Jigyasa", () => {
    const res1 = classifyVichar("क्या चेतना पदार्थ से उत्पन्न होती है?");
    expect(res1.short).toBe("जिज्ञासा");

    const res2 = classifyVichar("Why is the mind restless?");
    expect(res2.short).toBe("जिज्ञासा");
  });

  it("should classify spiritual consciousness keywords as Adhyatma", () => {
    const res = classifyVichar("आत्मा अजर और अमर है, चित्त की वृत्तियों का निरोध ही योग है।");
    expect(res.short).toBe("अध्यात्म");
  });

  it("should classify moral/virtue/subhashita keywords as Suvichar", () => {
    const res = classifyVichar("सत्यमेव जयते नानृतम्। धर्म की रक्षा से ही समाज की रक्षा होती है।");
    expect(res.short).toBe("सुविचार");
  });

  it("should classify Vedic scripture and science keywords as Gyan", () => {
    const res = classifyVichar("ऋग्वेद और उपनिषदों में ब्रह्माण्ड के भौतिक नियमों का विशद विश्लेषण है।");
    expect(res.short).toBe("ज्ञान");
  });

  it("should default to Darshan for general contemplative thoughts", () => {
    const res = classifyVichar("One thing is good that here there are no limits, I can just post.");
    expect(res.short).toBe("दर्शन");
  });

  it("should gracefully handle empty or null inputs", () => {
    expect(classifyVichar("").short).toBe("दर्शन");
    expect(classifyVichar(null).short).toBe("दर्शन");
  });
});
