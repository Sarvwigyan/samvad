import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  serverTimestamp,
  increment,
  runTransaction
} from "firebase/firestore";
import { db } from "../firebase";

/**
 * Fetches user profile from users/{uid}
 * @param {string} uid
 * @returns {Promise<object|null>} User profile data or null
 */
export async function getUserProfile(uid) {
  if (!uid) return null;
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      return { uid: userDoc.id, ...userDoc.data() };
    }
    return null;
  } catch (err) {
    console.error("Error fetching profile:", err);
    return null;
  }
}

/**
 * Fetches user profile by unique lowercase username
 * @param {string} username
 * @returns {Promise<object|null>}
 */
export async function getProfileByUsername(username) {
  if (!username) return null;
  try {
    const q = query(
      collection(db, "users"),
      where("username", "==", username.toLowerCase().trim()),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const d = snap.docs[0];
      return { uid: d.id, ...d.data() };
    }
    return null;
  } catch (err) {
    console.error("Error fetching profile by username:", err);
    return null;
  }
}

/**
 * Creates or updates user profile in users/{uid}
 * @param {string} uid
 * @param {object} profileData
 */
export async function upsertUserProfile(uid, profileData) {
  if (!uid) throw new Error("प्रयोक्ता पहचान अनिवार्य है");
  const userRef = doc(db, "users", uid);
  const existing = await getDoc(userRef);

  if (!existing.exists()) {
    const defaultData = {
      username: (profileData.username || `sadharak_${uid.slice(0, 6)}`).toLowerCase(),
      displayName: profileData.displayName || "सुधी साधक",
      bio: profileData.bio || "",
      avatarUrl: profileData.avatarUrl || null,
      bannerUrl: profileData.bannerUrl || null,
      location: profileData.location || "",
      website: profileData.website || "",
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      verified: false,
      isAdmin: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      preferences: {
        theme: "dark",
        language: "hi"
      }
    };
    await setDoc(userRef, defaultData);
    return defaultData;
  } else {
    const updateData = {
      ...profileData,
      updatedAt: serverTimestamp()
    };
    if (profileData.username) {
      updateData.username = profileData.username.toLowerCase();
    }
    await updateDoc(userRef, updateData);
    return { ...existing.data(), ...updateData };
  }
}

/**
 * Checks if current user is following target user
 * @param {string} currentUid
 * @param {string} targetUid
 * @returns {Promise<boolean>}
 */
export async function isFollowing(currentUid, targetUid) {
  if (!currentUid || !targetUid || currentUid === targetUid) return false;
  try {
    const followDoc = await getDoc(doc(db, "users", currentUid, "following", targetUid));
    return followDoc.exists();
  } catch (err) {
    return false;
  }
}

/**
 * Transactional Follow User
 * Updates both following/followers subcollections and counter fields atomically
 * @param {string} currentUid
 * @param {string} targetUid
 */
export async function followUser(currentUid, targetUid) {
  if (!currentUid || !targetUid || currentUid === targetUid) return;

  await runTransaction(db, async (transaction) => {
    const followRef = doc(db, "users", currentUid, "following", targetUid);
    const followerRef = doc(db, "users", targetUid, "followers", currentUid);
    const currentUserRef = doc(db, "users", currentUid);
    const targetUserRef = doc(db, "users", targetUid);

    const followDoc = await transaction.get(followRef);
    if (followDoc.exists()) return; // Already following

    transaction.set(followRef, {
      targetUid,
      createdAt: serverTimestamp()
    });

    transaction.set(followerRef, {
      followerUid: currentUid,
      createdAt: serverTimestamp()
    });

    transaction.update(currentUserRef, {
      followingCount: increment(1)
    });

    transaction.update(targetUserRef, {
      followersCount: increment(1)
    });
  });
}

/**
 * Transactional Unfollow User
 * @param {string} currentUid
 * @param {string} targetUid
 */
export async function unfollowUser(currentUid, targetUid) {
  if (!currentUid || !targetUid || currentUid === targetUid) return;

  await runTransaction(db, async (transaction) => {
    const followRef = doc(db, "users", currentUid, "following", targetUid);
    const followerRef = doc(db, "users", targetUid, "followers", currentUid);
    const currentUserRef = doc(db, "users", currentUid);
    const targetUserRef = doc(db, "users", targetUid);

    const followDoc = await transaction.get(followRef);
    if (!followDoc.exists()) return; // Not following

    transaction.delete(followRef);
    transaction.delete(followerRef);

    transaction.update(currentUserRef, {
      followingCount: increment(-1)
    });

    transaction.update(targetUserRef, {
      followersCount: increment(-1)
    });
  });
}

/**
 * Fetches list of followers for a user
 * @param {string} uid
 * @returns {Promise<Array<object>>}
 */
export async function getFollowers(uid) {
  if (!uid) return [];
  try {
    const snap = await getDocs(collection(db, "users", uid, "followers"));
    const followerIds = snap.docs.map((d) => d.id);
    const profiles = await Promise.all(followerIds.map((id) => getUserProfile(id)));
    return profiles.filter(Boolean);
  } catch (err) {
    console.error("Error fetching followers:", err);
    return [];
  }
}

/**
 * Fetches list of users being followed
 * @param {string} uid
 * @returns {Promise<Array<object>>}
 */
export async function getFollowing(uid) {
  if (!uid) return [];
  try {
    const snap = await getDocs(collection(db, "users", uid, "following"));
    const followingIds = snap.docs.map((d) => d.id);
    const profiles = await Promise.all(followingIds.map((id) => getUserProfile(id)));
    return profiles.filter(Boolean);
  } catch (err) {
    console.error("Error fetching following:", err);
    return [];
  }
}

/**
 * Creates a post / vichar
 * @param {object} param0
 */
export async function createVichar({ authorId, authorName, authorPhoto, text, bhav, isAnonymous, clientId }) {
  if (!authorId || !text) throw new Error("सामग्री व पहचान अनिवार्य है");

  const postData = {
    authorId,
    authorName: isAnonymous ? "साधक (गुप्त)" : (authorName || "सुधी पाठक"),
    authorPhoto: isAnonymous ? null : (authorPhoto || null),
    text: text.trim(),
    bhav: bhav || "विचार",
    isAnonymous: Boolean(isAnonymous),
    likeCount: 0,
    replyCount: 0,
    repostCount: 0,
    bookmarkCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    clientId: clientId || "web"
  };

  const docRef = await addDoc(collection(db, "posts"), postData);

  // Increment user postsCount
  try {
    await updateDoc(doc(db, "users", authorId), {
      postsCount: increment(1)
    });
  } catch (e) {
    // User profile doc might not exist yet
  }

  return { id: docRef.id, ...postData };
}

/**
 * Fetches posts authored by a specific user
 * @param {string} uid
 * @param {number} limitCount
 */
export async function getUserVichars(uid, limitCount = 30) {
  if (!uid) return [];
  try {
    const q = query(
      collection(db, "posts"),
      where("authorId", "==", uid),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("Error getting user posts:", err);
    return [];
  }
}
