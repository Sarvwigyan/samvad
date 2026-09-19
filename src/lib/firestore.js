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
  runTransaction,
  Timestamp,
  getCountFromServer,
  writeBatch
} from "firebase/firestore";
import { db } from "../firebase";
import {
  calculateExpireAt,
  calculateEngagement,
  shouldPreserve,
  YEAR_2099_MS
} from "./pruning";
import { createNotification } from "./notifications";
import { extractMentions, lookupMentionedUsers } from "./mentions";

/**
 * Fetches user profile from users/{uid}
 * Synchronizes true follower and following count from subcollections
 * @param {string} uid
 * @returns {Promise<object|null>} User profile data or null
 */
export async function getUserProfile(uid) {
  if (!uid) return null;
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    const data = userDoc.exists() ? { ...userDoc.data() } : {};

    // Retrieve exact counts from followers and following subcollections
    try {
      const [followersSnap, followingSnap] = await Promise.all([
        getCountFromServer(collection(db, "users", uid, "followers")),
        getCountFromServer(collection(db, "users", uid, "following"))
      ]);
      data.followersCount = followersSnap.data().count;
      data.followingCount = followingSnap.data().count;
    } catch (countErr) {
      // Keep existing counts if subcollection read fails
    }

    if (userDoc.exists() || data.followersCount > 0 || data.followingCount > 0) {
      return { uid, ...data };
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

    // Asynchronously synchronize author name/avatar across user's existing posts
    if (profileData.displayName || profileData.avatarUrl !== undefined) {
      syncUserPostsAuthorMetadata(uid, profileData.displayName, profileData.avatarUrl).catch(() => {});
    }

    return { ...existing.data(), ...updateData };
  }
}

/**
 * Synchronizes new author name and avatar across all recent posts authored by user
 * @param {string} uid
 * @param {string} newDisplayName
 * @param {string} newAvatarUrl
 */
export async function syncUserPostsAuthorMetadata(uid, newDisplayName, newAvatarUrl) {
  if (!uid || (!newDisplayName && newAvatarUrl === undefined)) return;
  try {
    const q = query(collection(db, "posts"), where("authorId", "==", uid), limit(50));
    const snap = await getDocs(q);
    if (snap.empty) return;

    const batch = writeBatch(db);
    snap.docs.forEach((docSnap) => {
      const updatePayload = {};
      if (newDisplayName) updatePayload.authorName = newDisplayName;
      if (newAvatarUrl !== undefined) updatePayload.authorPhoto = newAvatarUrl;
      batch.update(docSnap.ref, updatePayload);
    });
    await batch.commit();
  } catch (err) {
    console.warn("Notice: syncing author metadata on posts:", err?.message);
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

  const followRef = doc(db, "users", currentUid, "following", targetUid);
  const followerRef = doc(db, "users", targetUid, "followers", currentUid);
  const currentUserRef = doc(db, "users", currentUid);
  const targetUserRef = doc(db, "users", targetUid);

  try {
    await runTransaction(db, async (transaction) => {
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

      // Verify target user doc exists before updating their follower count
      const targetDoc = await transaction.get(targetUserRef);
      if (targetDoc.exists()) {
        transaction.update(targetUserRef, {
          followersCount: increment(1)
        });
      }
    });
  } catch (err) {
    console.warn("Transactional follow notice, applying resilient direct write:", err.message);
    await setDoc(followRef, { targetUid, createdAt: serverTimestamp() }).catch(() => {});
    await setDoc(followerRef, { followerUid: currentUid, createdAt: serverTimestamp() }).catch(() => {});
    await updateDoc(currentUserRef, { followingCount: increment(1) }).catch(() => {});
    await updateDoc(targetUserRef, { followersCount: increment(1) }).catch(() => {});
  }

  // Asynchronously notify target user of new follower
  getUserProfile(currentUid).then((prof) => {
    createNotification(targetUid, {
      type: "follow",
      fromUid: currentUid,
      fromName: prof?.displayName || "सुधी साधक",
      fromPhoto: prof?.avatarUrl || null
    }).catch(() => {});
  }).catch(() => {});
}

/**
 * Transactional Unfollow User
 * @param {string} currentUid
 * @param {string} targetUid
 */
export async function unfollowUser(currentUid, targetUid) {
  if (!currentUid || !targetUid || currentUid === targetUid) return;

  const followRef = doc(db, "users", currentUid, "following", targetUid);
  const followerRef = doc(db, "users", targetUid, "followers", currentUid);
  const currentUserRef = doc(db, "users", currentUid);
  const targetUserRef = doc(db, "users", targetUid);

  try {
    await runTransaction(db, async (transaction) => {
      const followDoc = await transaction.get(followRef);
      if (!followDoc.exists()) return; // Not following

      transaction.delete(followRef);
      transaction.delete(followerRef);

      transaction.update(currentUserRef, {
        followingCount: increment(-1)
      });

      // Verify target user doc exists before updating their follower count
      const targetDoc = await transaction.get(targetUserRef);
      if (targetDoc.exists()) {
        transaction.update(targetUserRef, {
          followersCount: increment(-1)
        });
      }
    });
  } catch (err) {
    console.warn("Transactional unfollow notice, applying resilient direct write:", err.message);
    await deleteDoc(followRef).catch(() => {});
    await deleteDoc(followerRef).catch(() => {});
    await updateDoc(currentUserRef, { followingCount: increment(-1) }).catch(() => {});
    await updateDoc(targetUserRef, { followersCount: increment(-1) }).catch(() => {});
  }
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
export async function createVichar({ authorId, authorName, authorPhoto, text, bhav, isAnonymous, clientId, images = [], poll = null, audioData = null, replyToId = null, threadId = null }) {
  if (!authorId) throw new Error("सामग्री व पहचान अनिवार्य है");
  
  // Enforce 2100 words limit
  const trimmed = (text || "").trim();
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  if (wordCount > 2100) {
    throw new Error("विचार अधिकतम 2100 शब्दों तक ही सीमित है");
  }

  if (!trimmed && images.length === 0 && !poll && !audioData) {
    throw new Error("विचार, चित्र, ऑडियो या मतदान अनिवार्य है");
  }

  // Ensure images array is capped at 4 items
  const cleanImages = Array.isArray(images) ? images.slice(0, 4).filter(Boolean) : [];

  let pollData = null;
  if (poll && Array.isArray(poll.options) && poll.options.length >= 2) {
    pollData = {
      question: poll.question || "",
      length: poll.options.length,
      totalVotes: 0,
      expiresAt: Timestamp.fromMillis(Date.now() + (poll.durationHours || 24) * 60 * 60 * 1000)
    };
    poll.options.forEach((optText, i) => {
      pollData[`opt${i}`] = { text: optText, votes: 0 };
    });
  }

  const postData = {
    authorId,
    uid: authorId,
    authorName: isAnonymous ? "साधक (गुप्त)" : (authorName || "सुधी पाठक"),
    authorPhoto: isAnonymous ? null : (authorPhoto || null),
    text: trimmed,
    images: cleanImages,
    poll: pollData,
    audioData: audioData || null,
    replyToId: replyToId || null,
    threadId: threadId || null,
    bhav: bhav || "विचार",
    isAnonymous: Boolean(isAnonymous),
    likeCount: 0,
    replyCount: 0,
    repostCount: 0,
    bookmarkCount: 0,
    viewCount: 0,
    engagementScore: 0,
    preserve: false,
    expireAt: Timestamp.fromMillis(calculateExpireAt(Date.now(), false)),
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

  // Asynchronously extract hashtags and update trending counts
  const hashtags = trimmed.match(/#[a-zA-Z0-9_\u0900-\u097F]+/gu) || [];
  if (hashtags.length > 0) {
    const uniqueTags = [...new Set(hashtags.map(t => t.toLowerCase()))].slice(0, 5); // Max 5 tags per post to prevent spam
    try {
      const updates = {};
      uniqueTags.forEach(tag => {
        updates[`tags.${tag}`] = increment(1);
      });
      await updateDoc(doc(db, "system", "trending"), updates).catch(async () => {
        // If document doesn't exist, create it
        await setDoc(doc(db, "system", "trending"), { tags: uniqueTags.reduce((acc, tag) => ({ ...acc, [tag]: 1 }), {}) });
      });
    } catch (err) {}
  }

  // Asynchronously process @mentions and notify mentioned users
  const mentions = extractMentions(trimmed);
  if (mentions.length > 0) {
    lookupMentionedUsers(mentions).then((users) => {
      users.forEach((u) => {
        if (u.uid && u.uid !== authorId) {
          createNotification(u.uid, {
            type: "mention",
            fromUid: authorId,
            fromName: isAnonymous ? "साधक (गुप्त)" : (authorName || "सुधी पाठक"),
            fromPhoto: isAnonymous ? null : authorPhoto,
            postId: docRef.id,
            postText: trimmed
          }).catch(() => {});
        }
      });
    }).catch(() => {});
  }

  return { id: docRef.id, ...postData };
}

/**
 * Fetch top trending hashtags
 * @returns {Promise<Array<{tag: string, count: number}>>}
 */
export async function getTrendingTags() {
  try {
    const docSnap = await getDoc(doc(db, "system", "trending"));
    if (docSnap.exists() && docSnap.data().tags) {
      const tagsObj = docSnap.data().tags;
      return Object.keys(tagsObj)
        .map(tag => ({ tag, count: tagsObj[tag] }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    }
  } catch (err) {}
  return [];
}

/**
 * Increment views on a post (stochastic 10% sampling to save writes)
 * @param {string} postId
 */
export async function incrementViews(postId) {
  if (!postId) return;
  // 10% chance to run, incrementing by 10 to approximate true views
  if (Math.random() < 0.1) {
    try {
      await updateDoc(doc(db, "posts", postId), {
        viewCount: increment(10)
      });
    } catch (e) {}
  }
}

/**
 * Checks if a user has voted on a post's poll
 * @param {string} postId
 * @param {string} uid
 * @returns {Promise<number|null>} Returns the option index they voted for, or null
 */
export async function getUserPollVote(postId, uid) {
  if (!postId || !uid) return null;
  try {
    const voteDoc = await getDoc(doc(db, "posts", postId, "votes", uid));
    if (voteDoc.exists()) {
      return voteDoc.data().optionIndex;
    }
  } catch (err) {}
  return null;
}

/**
 * Casts a vote on a poll
 * @param {string} postId
 * @param {string} uid
 * @param {number} optionIndex
 */
export async function castPollVote(postId, uid, optionIndex) {
  if (!postId || !uid || optionIndex === undefined) throw new Error("Missing parameters");
  
  const voteRef = doc(db, "posts", postId, "votes", uid);
  const postRef = doc(db, "posts", postId);
  
  await runTransaction(db, async (transaction) => {
    const voteDoc = await transaction.get(voteRef);
    if (voteDoc.exists()) {
      throw new Error("पहले ही मतदान किया जा चुका है");
    }
    
    const postDoc = await transaction.get(postRef);
    if (!postDoc.exists()) throw new Error("विचार नहीं मिला");
    
    const postData = postDoc.data();
    if (!postData.poll) throw new Error("इस विचार में मतदान नहीं है");
    if (postData.poll.expiresAt.toMillis() < Date.now()) {
      throw new Error("मतदान की समय सीमा समाप्त हो चुकी है");
    }
    
    transaction.set(voteRef, {
      uid,
      optionIndex,
      createdAt: serverTimestamp()
    });
    
    transaction.update(postRef, {
      [`poll.opt${optionIndex}.votes`]: increment(1),
      "poll.totalVotes": increment(1)
    });
  });
}

/**
 * Fetches posts authored by a specific user
 * @param {string} uid
 * @param {number} limitCount
 */
export async function getUserVichars(uid, limitCount = 50) {
  if (!uid) return [];
  try {
    const q1 = query(collection(db, "posts"), where("authorId", "==", uid), limit(limitCount));
    const snap1 = await getDocs(q1);

    const q2 = query(collection(db, "posts"), where("uid", "==", uid), limit(limitCount));
    const snap2 = await getDocs(q2);

    const map = new Map();
    snap1.docs.forEach((d) => map.set(d.id, { id: d.id, ...d.data() }));
    snap2.docs.forEach((d) => map.set(d.id, { id: d.id, ...d.data() }));

    const posts = Array.from(map.values());
    posts.sort((a, b) => {
      const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
      const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });
    return posts.slice(0, limitCount);
  } catch (err) {
    console.warn("getUserVichars notice:", err.message);
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
 * Updates a post's engagement score and triggers immortal preservation if criteria are met
 * @param {string} postId
 */
export async function syncPostPreservation(postId) {
  if (!postId) return;
  try {
    const postRef = doc(db, "posts", postId);
    const postSnap = await getDoc(postRef);
    if (!postSnap.exists()) return;

    const postData = postSnap.data();
    const engagement = calculateEngagement(postData);
    const updates = { engagementScore: engagement };

    if (!postData.preserve && shouldPreserve(postData)) {
      updates.preserve = true;
      updates.expireAt = Timestamp.fromMillis(YEAR_2099_MS);
    }

    await updateDoc(postRef, updates);
  } catch (e) {
    // Non-blocking sync
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
      syncPostPreservation(postId);
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
      syncPostPreservation(postId);
    } catch (e) {}

    // Asynchronously notify post author
    getDoc(postRef).then((snap) => {
      if (snap.exists()) {
        const p = snap.data();
        if (p.authorId && p.authorId !== uid) {
          getUserProfile(uid).then((prof) => {
            createNotification(p.authorId, {
              type: "like",
              fromUid: uid,
              fromName: prof?.displayName || "सुधी साधक",
              fromPhoto: prof?.avatarUrl || null,
              postId,
              postText: p.text
            }).catch(() => {});
          }).catch(() => {});
        }
      }
    }).catch(() => {});

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
      syncPostPreservation(postId);
    } catch (e) {}
    return { reposted: false, repostCountDelta: -1 };
  } else {
    await setDoc(repostRef, { uid, createdAt: serverTimestamp() });
    try {
      await updateDoc(postRef, {
        repostCount: increment(1)
      });
      syncPostPreservation(postId);
    } catch (e) {}

    // Asynchronously notify post author
    getDoc(postRef).then((snap) => {
      if (snap.exists()) {
        const p = snap.data();
        if (p.authorId && p.authorId !== uid) {
          getUserProfile(uid).then((prof) => {
            createNotification(p.authorId, {
              type: "repost",
              fromUid: uid,
              fromName: prof?.displayName || "सुधी साधक",
              fromPhoto: prof?.avatarUrl || null,
              postId,
              postText: p.text
            }).catch(() => {});
          }).catch(() => {});
        }
      }
    }).catch(() => {});

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
 * @param {string} folderName (Optional)
 * @returns {Promise<{ bookmarked: boolean }>}
 */
export async function toggleSmaran(postId, uid, folderName = "सामान्य") {
  if (!postId || !uid) throw new Error("पहचान अनिवार्य है");
  const markRef = doc(db, "users", uid, "bookmarks", postId);
  const postRef = doc(db, "posts", postId);

  const markDoc = await getDoc(markRef);
  if (markDoc.exists()) {
    await deleteDoc(markRef);
    try {
      await updateDoc(postRef, { bookmarkCount: increment(-1) });
      syncPostPreservation(postId);
    } catch (e) {}
    return { bookmarked: false };
  } else {
    await setDoc(markRef, { postId, folder: folderName, createdAt: serverTimestamp() });
    try {
      await updateDoc(postRef, { bookmarkCount: increment(1) });
      syncPostPreservation(postId);
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
    let snap;
    try {
      snap = await getDocs(
        query(collection(db, "users", uid, "bookmarks"), orderBy("createdAt", "desc"), limit(50))
      );
    } catch (orderErr) {
      console.warn("Bookmarks query without orderBy fallback:", orderErr.message);
      snap = await getDocs(query(collection(db, "users", uid, "bookmarks"), limit(50)));
    }

    const bookmarksData = snap.docs.map(d => ({ id: d.id, folder: d.data().folder || "सामान्य" }));
    const postPromises = bookmarksData.map((b) => getVicharById(b.id));
    const posts = await Promise.all(postPromises);
    const valid = posts.map((p, i) => (p ? { ...p, folder: bookmarksData[i].folder } : null)).filter(Boolean);
    valid.sort((a, b) => {
      const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt || 0);
      const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt || 0);
      return timeB - timeA;
    });
    return valid;
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
    syncPostPreservation(postId);
  } catch (e) {}

  // Asynchronously notify post author
  getDoc(doc(db, "posts", postId)).then((snap) => {
    if (snap.exists()) {
      const p = snap.data();
      if (p.authorId && p.authorId !== authorId) {
        createNotification(p.authorId, {
          type: "reply",
          fromUid: authorId,
          fromName: isAnonymous ? "साधक (गुप्त)" : (authorName || "सुधी पाठक"),
          fromPhoto: isAnonymous ? null : authorPhoto,
          postId,
          postText: text.trim()
        }).catch(() => {});
      }
    }
  }).catch(() => {});

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
    let snap;
    try {
      snap = await getDocs(
        query(collection(db, "posts", postId, "replies"), orderBy("createdAt", "asc"), limit(50))
      );
    } catch (orderErr) {
      console.warn("Replies query fallback without server orderBy:", orderErr.message);
      snap = await getDocs(query(collection(db, "posts", postId, "replies"), limit(50)));
    }

    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    list.sort((a, b) => {
      const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt || 0);
      const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt || 0);
      return timeA - timeB;
    });
    return list;
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

/**
 * Deletes a post/vichar from Firestore.
 * Requires authenticated user to be author or preserve == false per firestore.rules.
 * @param {string} postId
 */
export async function deleteVichar(postId) {
  if (!postId) return;
  const postRef = doc(db, "posts", postId);
  await deleteDoc(postRef);
}


