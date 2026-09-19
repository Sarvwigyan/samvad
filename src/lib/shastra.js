/**
 * Shastra & Subhashita Engine (शास्त्र एवं सुभाषित ज्ञानकोश)
 * Curates authentic Sanskrit wisdom with Devanagari verse,
 * Hindi translation (भावार्थ), canonical source, and dynamic daily rotation.
 */

export const SHASTRA_CORPUS = [
  {
    id: "vasudhaiva",
    shloka: "अयं निजः परो वेति गणना लघुचेतसाम्।\nउदारचरितानां तु वसुधैव कुटुम्बकम्॥",
    meaning: "यह मेरा है और यह पराया है, ऐसी गणना संकुचित मन वाले करते हैं। उदार चरित्र वालों के लिए तो संपूर्ण पृथ्वी ही एक परिवार है।",
    source: "महोपनिषद् (४.७१)",
    theme: "सद्भाव"
  },
  {
    id: "gita_karma",
    shloka: "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।\nमा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥",
    meaning: "तुम्हारा अधिकार केवल कर्म करने में है, फल की प्राप्ति में कभी नहीं। अतः कर्मफल के हेतु मत बनो और न ही अकर्मण्यता में तुम्हारी आसक्ति हो।",
    source: "श्रीमद्भगवद्गीता (२.४७)",
    theme: "कर्मयोग"
  },
  {
    id: "vidya_dadati",
    shloka: "विद्या ददाति विनयं विनयाद्याति पात्रताम्।\nपात्रत्वाद्धनमाप्नोति धनाद्धर्मं ततः सुखम्॥",
    meaning: "विद्या विनय (नम्रता) देती है, विनय से पात्रता आती है, पात्रता से धन की प्राप्ति होती है, धन से धर्म होता है और धर्म से ही वास्तविक सुख मिलता है।",
    source: "हितोपदेश (प्रस्ताविका)",
    theme: "विद्या"
  },
  {
    id: "satyam_eva_jayate",
    shloka: "सत्यमेव जयते नानृतं सत्येन पन्था विततो देवयानः।\nयेनाक्रमन्त्यृषयो ह्याप्तकामा यत्र तत् सत्यस्य परमं निधानम्॥",
    meaning: "सत्य की ही सदा विजय होती है, असत्य की नहीं। सत्य के द्वारा ही देवयान मार्ग का विस्तार होता है, जिस पर चलकर आप्तकाम ऋषि उस सत्य के परम धाम को प्राप्त होते हैं।",
    source: "मुण्डकोपनिषद् (३.१.६)",
    theme: "सत्य"
  },
  {
    id: "asato_ma",
    shloka: "असतो मा सद्गमय। तमसो मा ज्योतिर्गमय।\nमृत्य switchोर्मामृतं गमय॥",
    meaning: "हे परमात्मा! हमें असत्य से सत्य की ओर ले चलो, अंधकार से प्रकाश की ओर ले चलो, और मृत्यु से अमरत्व की ओर ले चलो।",
    source: "बृहदारण्यकोपनिषद् (१.३.२८)",
    theme: "प्रार्थना"
  },
  {
    id: "sangachhadhvam",
    shloka: "सं गच्छध्वं सं वदध्वं सं वो मनांसि जानताम्।\nदेवा भागं यथा पूर्वे सञ्जानाना उपासते॥",
    meaning: "हम सब साथ चलें, साथ बोलें, हमारे मन एक समान होकर विचार करें। जिस प्रकार पुरातन काल में देवगण अपने-अपने कर्तव्य को भली-भांति जानते हुए आचरण करते थे।",
    source: "ऋग्वेद (१०.१९१.२)",
    theme: "एकता"
  },
  {
    id: "dharmo_rakshati",
    shloka: "धर्म एव हतो हन्ति धर्मो रक्षति रक्षितः।\nतस्माद्धर्मो न हन्तव्यो मा नो धर्मो हतोऽवधीत्॥",
    meaning: "धर्म का नाश करने वाले का नाश स्वतः हो जाता है और धर्म की रक्षा करने वाले की धर्म रक्षा करता है। इसलिए धर्म की हानि कभी नहीं करनी चाहिए।",
    source: "मनुस्मृति (८.१५)",
    theme: "धर्म"
  },
  {
    id: "trini_ratnani",
    shloka: "पृथिव्यां त्रीणि रत्नानि जलमन्नं सुभाषितम्।\nमूढैः पाषाणखण्डेषु रत्नसंज्ञा विधीयते॥",
    meaning: "पृथ्वी पर वास्तविक तीन रत्न हैं—जल, अन्न और सुंदर ज्ञानयुक्त वाणी (सुभाषित)। अज्ञानी जन तो पत्थरों के टुकड़ों को ही रत्न मानते हैं।",
    source: "चाणक्य नीति (१४.१)",
    theme: "ज्ञान"
  },
  {
    id: "gita_atman",
    shloka: "नैनं छिन्दन्ति शस्त्राणि नैनं दहति पावकः।\nन चैनं क्लेदयन्त्यापो न शोषयति मारुतः॥",
    meaning: "आत्मा को न शस्त्र काट सकते हैं, न अग्नि जला सकती है, न जल इसे गीला कर सकता है और न वायु इसे सुखा सकती है। आत्मा नित्य और शाश्वत है।",
    source: "श्रीमद्भगवद्गीता (२.२३)",
    theme: "आत्मतत्व"
  },
  {
    id: "ekam_sat",
    shloka: "एकं सद् विप्रा बहुधा वदन्त्यग्निं\nयमं मातरिश्वानमाहुः॥",
    meaning: "सत्य (परम तत्व) केवल एक ही है, जिसे ज्ञानी जन भिन्न-भिन्न नामों (अग्नि, यम, वायु आदि) से पुकारते हैं।",
    source: "ऋग्वेद (१.१६४.४६)",
    theme: "सार्वभौमिक सत्य"
  },
  {
    id: "paropakaraya",
    shloka: "परोपकाराय फलन्ति वृक्षाः परोपकाराय वहन्ति नद्यः।\nपरोपकाराय दुहन्ति गावः परोपकारार्थमिदं शरीरम्॥",
    meaning: "परोपकार के लिए ही वृक्ष फल देते हैं, परोपकार के लिए नदियां बहती हैं, परोपकार के लिए गायें दूध देती हैं, और यह मानव शरीर भी परोपकार के लिए ही है।",
    source: "सुभाषितरत्नभाण्डागार",
    theme: "परोपकार"
  },
  {
    id: "udyogena",
    shloka: "उद्यमेन हि सिध्यन्ति कार्याणि न मनोरथैः।\nन हि सुप्तस्य सिंहस्य प्रविशन्ति मुखे मृगाः॥",
    meaning: "परिश्रम और पुरुषार्थ से ही कार्य सिद्ध होते हैं, केवल मनोरथ (सोचने) से नहीं। सोते हुए सिंह के मुख में हिरण स्वयं प्रवेश नहीं करता।",
    source: "पंचतंत्र (मित्रभेद)",
    theme: "पुरुषार्थ"
  }
];

/**
 * Gets a shloka based on the current day of the year for consistent daily rotation.
 */
export function getDailyShloka() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const diff = now - startOfYear;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  const index = dayOfYear % SHASTRA_CORPUS.length;
  return SHASTRA_CORPUS[index];
}

/**
 * Gets a random shloka different from currentId.
 */
export function getRandomShloka(currentId = null) {
  const filtered = SHASTRA_CORPUS.filter((s) => s.id !== currentId);
  const randomIndex = Math.floor(Math.random() * filtered.length);
  return filtered[randomIndex] || SHASTRA_CORPUS[0];
}

/**
 * Optional asynchronous fetcher that attempts to query a Vedic repository / API,
 * falling back gracefully to the rich local corpus.
 */
export async function fetchDynamicShloka(currentId = null) {
  try {
    // Attempt fast fetch from public Sanskrit repository
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
    // Sample external endpoint; falls back to instant local corpus on timeout/error
    const res = await fetch("https://vedicscriptures.github.io/slokas/random.json", {
      signal: controller.signal
    }).catch(() => null);
    
    clearTimeout(timeoutId);

    if (res && res.ok) {
      const data = await res.json();
      if (data?.slok && data?.translation) {
        return {
          id: `ext_${Date.now()}`,
          shloka: data.slok,
          meaning: data.translation,
          source: data.chapter ? `श्रीमद्भगवद्गीता (${data.chapter}.${data.verse || 1})` : "प्राचीन संहिता",
          theme: "शाश्वत ज्ञान"
        };
      }
    }
  } catch (e) {
    // Graceful offline fallback
  }

  return getRandomShloka(currentId);
}
