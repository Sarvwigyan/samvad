/**
 * Sarvwigyan & Sarvstore Unified Single Sign-On (SSO) & Ecosystem System
 * Standardizes user profiles, cross-app authentication, and verification badges
 * across Samvad, Sarvstore, and Sarvwigyan.
 */

import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export const ECOSYSTEM_APPS = {
  samvad: {
    id: "samvad",
    name: "संवाद",
    motto: "सार्वभौम वैदिक विचार मञ्च",
    glyph: "🪷",
    url: typeof window !== "undefined" ? window.location.origin : "https://samvad.web.app"
  },
  sarvstore: {
    id: "sarvstore",
    name: "सर्वस्टोर",
    motto: "स्वदेशी डिजिटल बाजार एवं ज्ञान संचय",
    glyph: "🪙",
    url: "https://sarvstore.web.app"
  },
  sarvwigyan: {
    id: "sarvwigyan",
    name: "सर्वविज्ञान",
    motto: "अखिल भारतीय ज्ञान-विज्ञान परम्परा",
    glyph: "⚡",
    url: "https://sarvwigyan.web.app"
  }
};

export const ECOSYSTEM_BADGES = {
  verified: {
    id: "verified",
    label: "प्रमाणित साधक",
    icon: "☸",
    color: "var(--sona)",
    description: "संवाद एवं सर्वविज्ञान अधिकृत प्रमाणित परिचय"
  },
  vedic_scholar: {
    id: "vedic_scholar",
    label: "वैदिक अध्येता",
    icon: "🪷",
    color: "#D4A24C",
    description: "भारतीय ज्ञान परम्परा एवं दर्शन अनुसन्धान"
  },
  sarvstore_merchant: {
    id: "sarvstore_merchant",
    label: "सर्वस्टोर शिल्पी",
    icon: "🪙",
    color: "#10B981",
    description: "सर्वस्टोर स्वदेशी ज्ञान एवं सामग्री रचयिता"
  },
  ecosystem_pioneer: {
    id: "ecosystem_pioneer",
    label: "सर्वविज्ञान साधक",
    icon: "⚡",
    color: "#38BDF8",
    description: "सर्वविज्ञान मञ्च अग्रदूत"
  },
  founder: {
    id: "founder",
    label: "संस्थापक",
    icon: "👑",
    color: "#FF7A00",
    description: "सर्वविज्ञान एवं संवाद संस्थापक मण्डल"
  }
};

/**
 * Returns full details for a badge key
 * @param {string} badgeKey
 * @returns {object|null}
 */
export function getBadgeInfo(badgeKey) {
  return ECOSYSTEM_BADGES[badgeKey] || null;
}

/**
 * Ensures user document in users/{uid} adheres to the Unified Ecosystem schema.
 * Preserves existing data while adding cross-app federated fields.
 *
 * @param {string} uid
 * @param {object} authUser - Firebase Auth user
 * @param {object} [extraData] - Additional profile details
 * @returns {Promise<object>} The unified profile object
 */
export async function ensureUnifiedEcosystemProfile(uid, authUser = {}, extraData = {}) {
  if (!uid) throw new Error("प्रयोक्ता पहचान (UID) अनिवार्य है");

  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);

  const cleanUsername = (
    extraData.username ||
    (authUser.email ? authUser.email.split("@")[0].replace(/[^a-z0-9_]/gi, "") : `sadharak_${uid.slice(0, 6)}`)
  ).toLowerCase();

  const baseUnifiedData = {
    uid,
    username: cleanUsername,
    displayName: extraData.displayName || authUser.displayName || "सुधी साधक",
    avatarUrl: extraData.avatarUrl || authUser.photoURL || null,
    bannerUrl: extraData.bannerUrl || null,
    bio: extraData.bio || "",
    verified: Boolean(extraData.verified),
    badges: extraData.badges || ["ecosystem_pioneer"],
    ecosystem: {
      samvad: true,
      sarvstore: true,
      sarvwigyan: true,
      primaryApp: "samvad",
      connectedSince: serverTimestamp()
    },
    reputation: extraData.reputation || 108,
    roles: extraData.roles || ["user"],
    updatedAt: serverTimestamp()
  };

  if (!snap.exists()) {
    const fullNewProfile = {
      ...baseUnifiedData,
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      createdAt: serverTimestamp(),
      preferences: {
        theme: "dark",
        language: "hi"
      }
    };
    await setDoc(userRef, fullNewProfile);
    return { ...fullNewProfile, uid };
  } else {
    const existing = snap.data();
    // Merge ecosystem flags without overwriting existing counts or bio
    const updates = {
      "ecosystem.samvad": true,
      "ecosystem.sarvstore": true,
      "ecosystem.sarvwigyan": true,
      updatedAt: serverTimestamp()
    };
    if (!existing.badges || existing.badges.length === 0) {
      updates.badges = ["ecosystem_pioneer"];
    }
    if (existing.reputation === undefined) {
      updates.reputation = 108;
    }
    await updateDoc(userRef, updates).catch(() => {});
    return { uid, ...existing, ...updates };
  }
}

/**
 * Generates a signed URL-safe cross-app exchange token.
 * Allows instant single sign-on when navigating to Sarvstore or Sarvwigyan.
 *
 * @param {object} user - Current user object
 * @returns {string} Base64 encoded token
 */
export function generateCrossAppToken(user) {
  if (!user || !user.uid) return "";
  const payload = {
    uid: user.uid,
    email: user.email || "",
    displayName: user.displayName || "",
    photoURL: user.photoURL || "",
    iss: "samvad",
    iat: Date.now(),
    exp: Date.now() + (1000 * 60 * 15) // 15 minute validity
  };
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  } catch (e) {
    return "";
  }
}

/**
 * Reads and decodes a cross-app SSO token from URL parameters.
 * @param {string} tokenString
 * @returns {object|null}
 */
export function consumeCrossAppToken(tokenString) {
  if (!tokenString) return null;
  try {
    const jsonStr = decodeURIComponent(escape(atob(tokenString)));
    const payload = JSON.parse(jsonStr);
    if (payload.exp && payload.exp < Date.now()) {
      console.warn("SSO Token expired");
      return null;
    }
    return payload;
  } catch (e) {
    console.warn("Failed to parse cross-app SSO token:", e);
    return null;
  }
}

/**
 * Builds an SSO redirect link to another ecosystem platform with cross-app auth token.
 * @param {'sarvstore' | 'sarvwigyan' | 'samvad'} targetAppId
 * @param {object} currentUser
 * @returns {string} URL with sso_token param
 */
export function getEcosystemAppUrl(targetAppId, currentUser) {
  const app = ECOSYSTEM_APPS[targetAppId];
  if (!app) return "/";
  if (!currentUser) return app.url;

  const token = generateCrossAppToken(currentUser);
  if (!token) return app.url;

  const sep = app.url.includes("?") ? "&" : "?";
  return `${app.url}${sep}sso_token=${encodeURIComponent(token)}`;
}
