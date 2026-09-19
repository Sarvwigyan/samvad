/**
 * Smart Client-side NLP Classification Engine for Vichar (संवाद)
 * Analyzes vocabulary, intent, punctuation, and linguistic markers in
 * Sanskrit, Hindi, and English to automatically categorize thoughts.
 */

export const BHAV_CATEGORIES = {
  JIGYASA: { id: "jigyasa", short: "जिज्ञासा", label: "जिज्ञासा / प्रश्न", glyph: "❓", color: "#3B82F6" },
  ADHYATMA: { id: "adhyatma", short: "अध्यात्म", label: "अध्यात्म / चिंतन", glyph: "🪷", color: "#A855F7" },
  SUVICHAR: { id: "suvichar", short: "सुविचार", label: "सुविचार / नीति", glyph: "🌸", color: "#EC4899" },
  GYAN: { id: "gyan", short: "ज्ञान", label: "विद्या / ज्ञान", glyph: "📜", color: "#F59E0B" },
  DARSHAN: { id: "darshan", short: "दर्शन", label: "दर्शन / विचार", glyph: "💡", color: "#D4A24C" }
};

// Linguistic Lexicons
const JIGYASA_MARKERS = [
  "?", "؟", "क्या", "क्यों", "कैसे", "कहाँ", "कब", "किसका", "किसने", "किसलिए", "किधर", "जिज्ञासा",
  "प्रश्न", "उत्तर", "समाधान", "संदेह", "शंका", "what", "why", "how", "when", "where", "who",
  "which", "whose", "query", "question", "curiosity"
];

const ADHYATMA_MARKERS = [
  "आत्मा", "परमात्मा", "ब्रह्म", "ईश्वर", "चित्त", "चेतना", "ध्यान", "समाधि", "मोक्ष", "मुक्ति",
  "निर्वाण", "कुण्डलिनी", "प्राणायाम", "साधना", "साधक", "अन्तःकरण", "साक्षी", "अद्वैत", "कैवल्य",
  "soul", "consciousness", "meditation", "samadhi", "moksha", "spiritual", "enlightenment",
  "divine", "transcendence", "prana"
];

const SUVICHAR_MARKERS = [
  "श्लोक", "सूक्ति", "नीति", "सुविचार", "धर्म", "कर्म", "सत्य", "अहिंसा", "सदाचार", "मर्यादा",
  "कर्तव्य", "सद्गुण", "परहित", "दया", "क्षमा", "संयम", "विनय", "सुभाषित", "wisdom", "quote",
  "virtue", "ethics", "dharma", "karma", "truth", "righteousness", "moral", "compassion"
];

const GYAN_MARKERS = [
  "वेद", "शास्त्र", "उपनिषद", "उपनिषद्", "गीता", "रामायण", "महाभारत", "पुराण", "संहिता", "ब्राह्मण",
  "आरण्यक", "सूत्र", "व्याकरण", "पाणिनि", "विज्ञान", "आयुर्वेद", "ज्योतिष", "गणित", "खगोल",
  "पदार्थ", "तर्कशास्त्र", "न्याय", "मीमांसा", "इतिहास", "वेदवेदांग", "science", "physics",
  "mathematics", "scripture", "veda", "upanishad", "knowledge", "research", "ayurveda"
];

/**
 * Automatically classifies post text into an appropriate Bhav category.
 * @param {string} text - Raw input text
 * @returns {{ id: string, short: string, label: string, glyph: string, color: string }}
 */
export function classifyVichar(text = "") {
  if (!text || typeof text !== "string") {
    return BHAV_CATEGORIES.DARSHAN;
  }

  const clean = text.toLowerCase();

  // 1. High-priority check for questions / inquiry
  if (clean.includes("?") || clean.includes("؟")) {
    return BHAV_CATEGORIES.JIGYASA;
  }

  // Count keyword occurrences for each category
  const scores = {
    jigyasa: 0,
    adhyatma: 0,
    suvichar: 0,
    gyan: 0,
    darshan: 0
  };

  for (const word of JIGYASA_MARKERS) {
    if (clean.includes(word)) scores.jigyasa += 2;
  }

  for (const word of ADHYATMA_MARKERS) {
    if (clean.includes(word)) scores.adhyatma += 2;
  }

  for (const word of SUVICHAR_MARKERS) {
    if (clean.includes(word)) scores.suvichar += 2;
  }

  for (const word of GYAN_MARKERS) {
    if (clean.includes(word)) scores.gyan += 2;
  }

  // Find category with highest positive score
  let maxCat = "darshan";
  let maxScore = 0;

  for (const [cat, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxCat = cat;
    }
  }

  if (maxScore > 0) {
    switch (maxCat) {
      case "jigyasa": return BHAV_CATEGORIES.JIGYASA;
      case "adhyatma": return BHAV_CATEGORIES.ADHYATMA;
      case "suvichar": return BHAV_CATEGORIES.SUVICHAR;
      case "gyan": return BHAV_CATEGORIES.GYAN;
      default: return BHAV_CATEGORIES.DARSHAN;
    }
  }

  // Default neutral philosophical thought
  return BHAV_CATEGORIES.DARSHAN;
}
