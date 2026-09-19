/**
 * User profile and post validation rules for Samwad.
 * Enforces server and client constraints uniformly.
 */

export const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

/**
 * Validates a username according to platform rules.
 * Must be 3-20 characters, lowercase alphanumeric and underscores only.
 * @param {string} username
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateUsername(username) {
  if (!username || typeof username !== "string") {
    return { valid: false, error: "प्रयोक्ता-नाम अनिवार्य है (Username is required)" };
  }
  const clean = username.trim();
  if (clean.length < 3) {
    return { valid: false, error: "प्रयोक्ता-नाम न्यूनतम 3 अक्षरों का होना चाहिए (Min 3 characters)" };
  }
  if (clean.length > 20) {
    return { valid: false, error: "प्रयोक्ता-नाम अधिकतम 20 अक्षरों का हो सकता है (Max 20 characters)" };
  }
  if (!USERNAME_REGEX.test(clean)) {
    return {
      valid: false,
      error: "केवल छोटे अक्षर (a-z), अंक (0-9) और अंडरस्कोर (_) मान्य हैं"
    };
  }
  return { valid: true, sanitized: clean };
}

/**
 * Validates a bio description (max 160 characters).
 * @param {string} bio
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateBio(bio) {
  if (!bio) return { valid: true, sanitized: "" };
  if (typeof bio !== "string") {
    return { valid: false, error: "अवैध परिचय विवरण" };
  }
  if (bio.length > 160) {
    return { valid: false, error: "परिचय विवरण अधिकतम 160 अक्षरों का होना चाहिए (Max 160 chars)" };
  }
  return { valid: true, sanitized: bio.trim() };
}

/**
 * Validates post text (1-500 characters).
 * @param {string} text
 * @returns {{ valid: boolean, error?: string }}
 */
export function validatePostText(text) {
  if (!text || typeof text !== "string") {
    return { valid: false, error: "विचार रिक्त नहीं हो सकता" };
  }
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: "विचार में सामग्री अनिवार्य है" };
  }
  if (trimmed.length > 500) {
    return { valid: false, error: "विचार अधिकतम 500 अक्षरों तक ही सीमित है" };
  }
  return { valid: true, sanitized: trimmed };
}
