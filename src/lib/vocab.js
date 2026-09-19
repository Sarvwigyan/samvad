/**
 * Single source of truth for Samwad's Bharatiya Sanskriti UI vocabulary.
 * Follows philosophical and cultural terminology. No religious terms.
 */
export const vocab = {
  post: { hi: "विचार", en: "Vichar" },
  reply: { hi: "उत्तर", en: "Uttar" },
  like: { hi: "अनुमोदन", en: "Anumodan" },
  repost: { hi: "प्रसार", en: "Prasar" },
  quote: { hi: "सह-विचार", en: "Sah-vichar" },
  bookmark: { hi: "स्मरण", en: "Smaran" },
  share: { hi: "संक्रमण", en: "Sankraman" },
  follow: { hi: "अनुसरण", en: "Anusaran" },
  followers: { hi: "अनुसारी", en: "Anusari" },
  following: { hi: "अनुसरित", en: "Anusarit" },
  profile: { hi: "परिचय", en: "Parichay" },
  home: { hi: "प्रवाह", en: "Pravah" },
  explore: { hi: "अन्वेषण", en: "Anveshan" },
  search: { hi: "खोज", en: "Khoj" },
  notifications: { hi: "सूचना", en: "Soochna" },
  settings: { hi: "व्यवस्था", en: "Vyavastha" },
  account: { hi: "अभिलेख", en: "Abhilekh" },
  privacy: { hi: "गोपनीयता", en: "Gopniyata" },
  block: { hi: "अवरोध", en: "Avarodh" },
  mute: { hi: "मौन", en: "Maun" },
  report: { hi: "निवेदन", en: "Nivedan" },
  delete: { hi: "विलोपन", en: "Vilopan" },
  edit: { hi: "संशोधन", en: "Sanshodhan" },
  trending: { hi: "प्रवाहित", en: "Pravahit" },
  topic: { hi: "विषय", en: "Vishay" },
  verified: { hi: "प्रमाणित", en: "Pramaneet" },
  admin: { hi: "अधिकारी", en: "Adhikari" },
  logout: { hi: "बहिर्गम", en: "Bahirgam" },
  welcome: { hi: "स्वागत", en: "Swagat" }
};

/**
 * Helper to fetch a term by key with preferred language.
 * @param {string} key - Vocabulary key
 * @param {'hi' | 'en'} lang - Target language, defaults to 'hi'
 * @returns {string} Translated term
 */
export function t(key, lang = "hi") {
  const item = vocab[key];
  if (!item) return key;
  return item[lang] || item.hi || key;
}
