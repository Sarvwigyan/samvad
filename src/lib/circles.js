/**
 * Sadhak Circles / Lists (साधक मण्डल) System for Samwad
 * Allows users to curate custom feeds of specific authors
 * (e.g. दर्शन, इतिहास, विज्ञान) separate from the global stream.
 */

import { collection, doc, getDocs, setDoc, deleteDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

const CIRCLES_STORAGE_KEY = "samwad_user_circles";

export const DEFAULT_CIRCLES = [
  {
    id: "circle_darshan",
    name: "दर्शन एवं वेदान्त",
    category: "darshan",
    icon: "🪷",
    description: "उपनिषद्, भगवद्गीता, सांख्य एवं वेदान्त विमर्श",
    memberUids: ["curated_vedanta", "curated_sanskrit"],
    isDefault: true,
    createdAt: 0
  },
  {
    id: "circle_itihas",
    name: "इतिहास एवं संस्कृति",
    category: "itihas",
    icon: "🏛️",
    description: "भारतीय इतिहास, परम्परा, साहित्य एवं सभ्यता",
    memberUids: ["curated_vidya"],
    isDefault: true,
    createdAt: 0
  },
  {
    id: "circle_vigyan",
    name: "विज्ञान एवं प्रौद्योगिकी",
    category: "vigyan",
    icon: "⚡",
    description: "भारतीय गणित, खगोल, आयुर्वेद एवं आधुनिक शोध",
    memberUids: [],
    isDefault: true,
    createdAt: 0
  }
];

/**
 * Retrieves all circles for the current user (presets + custom circles).
 * Synchronized with local storage and Firestore.
 *
 * @param {string|null} uid
 * @returns {Promise<Array<object>>}
 */
export async function getUserCircles(uid) {
  let customCircles = [];

  // 1. Read from local storage cache first
  try {
    const raw = localStorage.getItem(`${CIRCLES_STORAGE_KEY}_${uid || "guest"}`);
    if (raw) {
      customCircles = JSON.parse(raw);
    }
  } catch (e) {}

  // 2. If authenticated, fetch from Firestore subcollection users/{uid}/circles
  if (uid) {
    try {
      const snap = await getDocs(collection(db, "users", uid, "circles"));
      if (!snap.empty) {
        const firestoreCircles = snap.docs.map((d) => ({ id: d.id, ...d.data(), isDefault: false }));
        customCircles = firestoreCircles;
        try {
          localStorage.setItem(`${CIRCLES_STORAGE_KEY}_${uid}`, JSON.stringify(customCircles));
        } catch (e) {}
      }
    } catch (err) {
      // Permission or offline fallback
    }
  }

  // Combine default preset circles with user's custom circles
  const combined = [...DEFAULT_CIRCLES];
  for (const c of customCircles) {
    if (!combined.some((item) => item.id === c.id)) {
      combined.push(c);
    }
  }

  return combined;
}

/**
 * Creates a new custom Sadhak Circle (मण्डल)
 * @param {string|null} uid
 * @param {object} circleData
 * @returns {Promise<object>}
 */
export async function createCircle(uid, { name, description = "", icon = "⭕", memberUids = [] }) {
  const circleId = `circle_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const newCircle = {
    id: circleId,
    name: name.trim(),
    description: description.trim(),
    icon: icon || "⭕",
    memberUids: Array.from(new Set(memberUids)),
    isDefault: false,
    authorId: uid || "local",
    createdAt: Date.now()
  };

  // Save to local storage
  try {
    const existing = await getUserCircles(uid);
    const customOnly = existing.filter((c) => !c.isDefault);
    const updated = [newCircle, ...customOnly];
    localStorage.setItem(`${CIRCLES_STORAGE_KEY}_${uid || "guest"}`, JSON.stringify(updated));
  } catch (e) {}

  // Save to Firestore if logged in
  if (uid) {
    try {
      await setDoc(doc(db, "users", uid, "circles", circleId), {
        ...newCircle,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.warn("Could not sync circle to Firestore:", err.message);
    }
  }

  return newCircle;
}

/**
 * Adds an author UID to a circle
 * @param {string|null} uid
 * @param {string} circleId
 * @param {string} memberUid
 * @returns {Promise<boolean>}
 */
export async function addMemberToCircle(uid, circleId, memberUid) {
  if (!memberUid) return false;

  const circles = await getUserCircles(uid);
  const target = circles.find((c) => c.id === circleId);
  if (!target) return false;

  const members = new Set(target.memberUids || []);
  members.add(memberUid);
  const updatedMembers = Array.from(members);

  // Update in local storage
  try {
    const customOnly = circles.filter((c) => !c.isDefault);
    const updatedCustom = customOnly.map((c) => (c.id === circleId ? { ...c, memberUids: updatedMembers } : c));
    localStorage.setItem(`${CIRCLES_STORAGE_KEY}_${uid || "guest"}`, JSON.stringify(updatedCustom));
  } catch (e) {}

  // Update in Firestore
  if (uid && !target.isDefault) {
    try {
      await updateDoc(doc(db, "users", uid, "circles", circleId), {
        memberUids: updatedMembers
      });
    } catch (e) {}
  }

  return true;
}

/**
 * Removes an author UID from a circle
 * @param {string|null} uid
 * @param {string} circleId
 * @param {string} memberUid
 * @returns {Promise<boolean>}
 */
export async function removeMemberFromCircle(uid, circleId, memberUid) {
  const circles = await getUserCircles(uid);
  const target = circles.find((c) => c.id === circleId);
  if (!target) return false;

  const updatedMembers = (target.memberUids || []).filter((id) => id !== memberUid);

  try {
    const customOnly = circles.filter((c) => !c.isDefault);
    const updatedCustom = customOnly.map((c) => (c.id === circleId ? { ...c, memberUids: updatedMembers } : c));
    localStorage.setItem(`${CIRCLES_STORAGE_KEY}_${uid || "guest"}`, JSON.stringify(updatedCustom));
  } catch (e) {}

  if (uid && !target.isDefault) {
    try {
      await updateDoc(doc(db, "users", uid, "circles", circleId), {
        memberUids: updatedMembers
      });
    } catch (e) {}
  }

  return true;
}

/**
 * Deletes a custom circle
 * @param {string|null} uid
 * @param {string} circleId
 * @returns {Promise<boolean>}
 */
export async function deleteCircle(uid, circleId) {
  const circles = await getUserCircles(uid);
  const customOnly = circles.filter((c) => !c.isDefault && c.id !== circleId);

  try {
    localStorage.setItem(`${CIRCLES_STORAGE_KEY}_${uid || "guest"}`, JSON.stringify(customOnly));
  } catch (e) {}

  if (uid) {
    try {
      await deleteDoc(doc(db, "users", uid, "circles", circleId));
    } catch (e) {}
  }

  return true;
}
