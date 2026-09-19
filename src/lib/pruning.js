import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getCountFromServer,
  writeBatch,
  runTransaction,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { ref, uploadString } from "firebase/storage";
import { db, storage } from "../firebase";

/**
 * Pruning and TTL Configuration
 */
export const YEAR_2099_MS = 4102444800000;
export const TTL_DAYS = 90;
export const TTL_DURATION_MS = TTL_DAYS * 24 * 60 * 60 * 1000;
export const PRUNING_THRESHOLD = 10000;
export const BATCH_PRUNE_SIZE = 500;
export const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
export const ARCHIVE_ENABLED = true;

const LAST_PRUNE_KEY = "samwad_last_prune_check";

/**
 * Internal debug logger (only logs in dev environment)
 */
export function debug(...args) {
  if (import.meta.env?.DEV) {
    // eslint-disable-next-line no-console
    console.debug("[Pruning]", ...args);
  }
}

/**
 * Calculates expireAt timestamp.
 * If preserved, pushes expiry to Year 2099 (Immortal).
 * Otherwise sets expiry to current time + 90 days.
 * @param {number} [nowMs=Date.now()]
 * @param {boolean} [isPreserved=false]
 * @returns {number} Epoch milliseconds
 */
export function calculateExpireAt(nowMs = Date.now(), isPreserved = false) {
  if (isPreserved) {
    return YEAR_2099_MS;
  }
  return nowMs + TTL_DURATION_MS;
}

/**
 * Computes engagement score using canonical weighting:
 * likes + (replies * 2) + (reposts * 3) + (bookmarks * 4)
 * @param {object} post
 * @returns {number}
 */
export function calculateEngagement(post = {}) {
  const likes = Number(post.likeCount || 0);
  const replies = Number(post.replyCount || 0);
  const reposts = Number(post.repostCount || 0);
  const bookmarks = Number(post.bookmarkCount || 0);

  return likes + (replies * 2) + (reposts * 3) + (bookmarks * 4);
}

/**
 * Determines whether a post should be immortalized (preserve = true).
 * Rules:
 *   a) Total engagement >= 10
 *   b) Bookmarked by >= 1 user (bookmarks are highest commitment)
 *   c) Reposted >= 1 time
 *   d) Pinned by admin or already marked preserved
 * @param {object} post
 * @returns {boolean}
 */
export function shouldPreserve(post = {}) {
  if (post.preserve === true || post.isPinned === true || post.pinned === true) {
    return true;
  }
  const bookmarks = Number(post.bookmarkCount || 0);
  if (bookmarks >= 1) {
    return true;
  }
  const reposts = Number(post.repostCount || 0);
  if (reposts >= 1) {
    return true;
  }
  const engagement = calculateEngagement(post);
  return engagement >= 10;
}

/**
 * Archive batch of posts to Firebase Storage prior to deletion
 * @param {Array<object>} posts
 */
async function archivePostsBeforeDelete(posts) {
  if (!ARCHIVE_ENABLED || !storage || posts.length === 0) return;
  try {
    const dateStr = new Date().toISOString().split("T")[0];
    const timestamp = Date.now();
    const storageRef = ref(storage, `archive/${dateStr}_${timestamp}.json`);
    const payload = JSON.stringify(posts, null, 2);
    await uploadString(storageRef, payload, "raw", {
      contentType: "application/json"
    });
    debug(`Archived ${posts.length} posts to archive/${dateStr}_${timestamp}.json`);
  } catch (err) {
    // Archival failure should not block storage cleanup
    debug("Archive warning:", err.message);
  }
}

/**
 * Client-Side Count-Based Pruning.
 * Runs on mount after 30s delay, throttled to 1/10 users and once per 24 hours.
 * Uses atomic Firestore lock on `system/pruning-lock` to avoid concurrency.
 * @param {object} [options={}]
 * @param {boolean} [options.force=false] - Bypass random check and 24h throttle for testing
 * @returns {Promise<{ pruned: boolean, deletedCount: number, reason?: string }>}
 */
export async function pruneIfNeeded(options = {}) {
  const { force = false } = options;

  // 1. Check 24-hour client throttle
  if (!force) {
    const lastCheck = localStorage.getItem(LAST_PRUNE_KEY);
    if (lastCheck) {
      const elapsed = Date.now() - Number(lastCheck);
      if (elapsed < 24 * 60 * 60 * 1000) {
        return { pruned: false, deletedCount: 0, reason: "throttled_24h" };
      }
    }

    // 2. Update check timestamp early to prevent repeated triggers
    try {
      localStorage.setItem(LAST_PRUNE_KEY, Date.now().toString());
    } catch (e) {}

    // 3. Random sampling: 1 in 10 users triggers count check
    if (Math.random() >= 0.1) {
      return { pruned: false, deletedCount: 0, reason: "not_sampled" };
    }
  }

  try {
    // 3. Fast, cheap aggregation read for total post count (1 read only)
    const countSnapshot = await getCountFromServer(collection(db, "posts"));
    const totalCount = countSnapshot.data().count;

    debug(`Current post count: ${totalCount}`);

    if (totalCount <= PRUNING_THRESHOLD && !force) {
      return { pruned: false, deletedCount: 0, reason: "below_threshold" };
    }

    // 4. Acquire distributed lock on system/pruning-lock
    const lockRef = doc(db, "system", "pruning-lock");
    let lockAcquired = false;

    try {
      await runTransaction(db, async (transaction) => {
        const lockDoc = await transaction.get(lockRef);
        const now = Date.now();

        if (lockDoc.exists()) {
          const lockData = lockDoc.data();
          const lockAge = now - (lockData.timestamp || 0);
          if (lockData.active && lockAge < LOCK_TIMEOUT_MS) {
            throw new Error("Lock is currently held by another client");
          }
        }

        transaction.set(lockRef, {
          active: true,
          timestamp: now,
          updatedAt: serverTimestamp()
        });
        lockAcquired = true;
      });
    } catch (lockErr) {
      debug("Lock acquisition skipped:", lockErr.message);
      return { pruned: false, deletedCount: 0, reason: "locked" };
    }

    if (!lockAcquired) {
      return { pruned: false, deletedCount: 0, reason: "lock_failed" };
    }

    try {
      // 5. Query oldest unpreserved posts (preserve == false)
      const q = query(
        collection(db, "posts"),
        where("preserve", "==", false),
        orderBy("createdAt", "asc"),
        limit(BATCH_PRUNE_SIZE)
      );

      const snap = await getDocs(q);
      if (snap.empty) {
        return { pruned: false, deletedCount: 0, reason: "no_unpreserved_posts" };
      }

      const postsToDelete = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // 6. Optional archival before deletion
      await archivePostsBeforeDelete(postsToDelete);

      // 7. Atomic batch delete
      const batch = writeBatch(db);
      snap.docs.forEach((d) => {
        batch.delete(d.ref);
      });
      await batch.commit();

      debug(`Successfully pruned ${postsToDelete.length} low-value posts`);
      return { pruned: true, deletedCount: postsToDelete.length };
    } finally {
      // 8. Always release distributed lock
      try {
        await runTransaction(db, async (transaction) => {
          transaction.set(lockRef, {
            active: false,
            timestamp: Date.now(),
            updatedAt: serverTimestamp()
          });
        });
      } catch (releaseErr) {
        debug("Lock release notice:", releaseErr.message);
      }
    }
  } catch (err) {
    debug("Pruning execution error:", err.message);
    return { pruned: false, deletedCount: 0, reason: err.message };
  }
}
