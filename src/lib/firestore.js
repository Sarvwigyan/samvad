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
  deleteDoc,
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
    uid: authorId,
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

/**
 * Fetches a single Vichar by its ID
 * @param {string} postId
 * @returns {Promise<object|null>}
 */
export async function getVicharById(postId) {
  if (!postId) return null;
  try {
    const docSnap = await getDoc(doc(db, "posts", postId));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (err) {
    console.error("Error fetching Vichar by ID:", err);
    return null;
  }
}

/**
 * Checks if current user has liked (anumodan) a post
 * @param {string} postId
 * @param {string} uid
 * @returns {Promise<boolean>}
 */
export async function isPostLiked(postId, uid) {
  if (!postId || !uid) return false;
  try {
    const likeDoc = await getDoc(doc(db, "posts", postId, "likes", uid));
    return likeDoc.exists();
  } catch (err) {
    return false;
  }
}

/**
 * Toggles Anumodan (Like) on a post
 * @param {string} postId
 * @param {string} uid
 * @returns {Promise<{ liked: boolean, likeCountDelta: number }>}
 */
export async function toggleAnumodan(postId, uid) {
  if (!postId || !uid) throw new Error("प्रयोक्ता व विचार पहचान अनिवार्य है");
  const likeRef = doc(db, "posts", postId, "likes", uid);
  const postRef = doc(db, "posts", postId);
  const userLikeRef = doc(db, "users", uid, "likes", postId);

  const likeDoc = await getDoc(likeRef);
  if (likeDoc.exists()) {
    // Unlike
    await deleteDoc(likeRef);
    try { await deleteDoc(userLikeRef); } catch (e) {}
    try {
      await updateDoc(postRef, {
        likeCount: increment(-1)
      });
    } catch (e) {}
    return { liked: false, likeCountDelta: -1 };
  } else {
    // Like
    await setDoc(likeRef, { uid, createdAt: serverTimestamp() });
    try { await setDoc(userLikeRef, { postId, createdAt: serverTimestamp() }); } catch (e) {}
    try {
      await updateDoc(postRef, {
        likeCount: increment(1)
      });
    } catch (e) {}
    return { liked: true, likeCountDelta: 1 };
  }
}

/**
 * Checks if current user has reposted (prasar) a post
 * @param {string} postId
 * @param {string} uid
 * @returns {Promise<boolean>}
 */
export async function isPostReposted(postId, uid) {
  if (!postId || !uid) return false;
  try {
    const repostDoc = await getDoc(doc(db, "posts", postId, "reposts", uid));
    return repostDoc.exists();
  } catch (err) {
    return false;
  }
}

/**
 * Toggles Prasar (Repost) on a post
 * @param {string} postId
 * @param {string} uid
 * @returns {Promise<{ reposted: boolean, repostCountDelta: number }>}
 */
export async function togglePrasar(postId, uid) {
  if (!postId || !uid) throw new Error("प्रयोक्ता व विचार पहचान अनिवार्य है");
  const repostRef = doc(db, "posts", postId, "reposts", uid);
  const postRef = doc(db, "posts", postId);

  const repostDoc = await getDoc(repostRef);
  if (repostDoc.exists()) {
    await deleteDoc(repostRef);
    try {
      await updateDoc(postRef, {
        repostCount: increment(-1)
      });
    } catch (e) {}
    return { reposted: false, repostCountDelta: -1 };
  } else {
    await setDoc(repostRef, { uid, createdAt: serverTimestamp() });
    try {
      await updateDoc(postRef, {
        repostCount: increment(1)
      });
    } catch (e) {}
    return { reposted: true, repostCountDelta: 1 };
  }
}

/**
 * Checks if current user has bookmarked (smaran) a post
 * @param {string} postId
 * @param {string} uid
 * @returns {Promise<boolean>}
 */
export async function isPostBookmarked(postId, uid) {
  if (!postId || !uid) return false;
  try {
    const markDoc = await getDoc(doc(db, "users", uid, "bookmarks", postId));
    return markDoc.exists();
  } catch (err) {
    return false;
  }
}

/**
 * Toggles Smaran (Bookmark) for a post
 * @param {string} postId
 * @param {string} uid
 * @returns {Promise<{ bookmarked: boolean }>}
 */
export async function toggleSmaran(postId, uid) {
  if (!postId || !uid) throw new Error("पहचान अनिवार्य है");
  const markRef = doc(db, "users", uid, "bookmarks", postId);
  const postRef = doc(db, "posts", postId);

  const markDoc = await getDoc(markRef);
  if (markDoc.exists()) {
    await deleteDoc(markRef);
    try {
      await updateDoc(postRef, { bookmarkCount: increment(-1) });
    } catch (e) {}
    return { bookmarked: false };
  } else {
    await setDoc(markRef, { postId, createdAt: serverTimestamp() });
    try {
      await updateDoc(postRef, { bookmarkCount: increment(1) });
    } catch (e) {}
    return { bookmarked: true };
  }
}

/**
 * Fetches all bookmarked posts for a user
 * @param {string} uid
 * @returns {Promise<Array<object>>}
 */
export async function getUserBookmarks(uid) {
  if (!uid) return [];
  try {
    const snap = await getDocs(
      query(collection(db, "users", uid, "bookmarks"), orderBy("createdAt", "desc"), limit(50))
    );
    const postIds = snap.docs.map((d) => d.id);
    const postPromises = postIds.map((id) => getVicharById(id));
    const posts = await Promise.all(postPromises);
    return posts.filter(Boolean);
  } catch (err) {
    console.error("Error loading bookmarks:", err);
    return [];
  }
}

/**
 * Creates an Uttar (Reply) for a Vichar
 * @param {string} postId
 * @param {object} reply
 */
export async function createUttar(postId, { authorId, authorName, authorPhoto, text, isAnonymous }) {
  if (!postId || !authorId || !text) throw new Error("उत्तर सामग्री व पहचान अनिवार्य है");

  const replyData = {
    postId,
    authorId,
    uid: authorId,
    authorName: isAnonymous ? "साधक (गुप्त)" : (authorName || "सुधी पाठक"),
    authorPhoto: isAnonymous ? null : (authorPhoto || null),
    text: text.trim(),
    isAnonymous: Boolean(isAnonymous),
    likeCount: 0,
    createdAt: serverTimestamp()
  };

  const replyRef = await addDoc(collection(db, "posts", postId, "replies"), replyData);

  try {
    await updateDoc(doc(db, "posts", postId), {
      replyCount: increment(1)
    });
  } catch (e) {}

  return { id: replyRef.id, ...replyData };
}

/**
 * Fetches all replies for a given Vichar
 * @param {string} postId
 * @returns {Promise<Array<object>>}
 */
export async function getPostReplies(postId) {
  if (!postId) return [];
  try {
    const q = query(
      collection(db, "posts", postId, "replies"),
      orderBy("createdAt", "asc"),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("Error fetching replies:", err);
    return [];
  }
}

/**
 * Fetches suggested sadhaks / users to follow
 * @param {string} currentUid
 * @param {number} limitCount
 * @returns {Promise<Array<object>>}
 */
export async function getSuggestedSadhaks(currentUid, limitCount = 4) {
  try {
    const snap = await getDocs(
      query(collection(db, "users"), limit(10))
    );
    return snap.docs
      .map((d) => ({ uid: d.id, ...d.data() }))
      .filter((u) => u.uid !== currentUid)
      .slice(0, limitCount);
  } catch (err) {
    console.warn("Could not fetch suggested sadhaks:", err);
    return [];
  }
}

