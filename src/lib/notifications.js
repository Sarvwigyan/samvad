import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  getDocs
} from "firebase/firestore";
import { db } from "../firebase";

/**
 * Creates a notification for a target user.
 * Skips creation if the actor is notifying themselves.
 *
 * @param {string} targetUid - User receiving the notification
 * @param {object} notifData - Notification details
 * @param {string} notifData.type - "like" | "reply" | "repost" | "follow" | "mention"
 * @param {string} notifData.fromUid - Acting user's UID
 * @param {string} notifData.fromName - Acting user's name
 * @param {string|null} notifData.fromPhoto - Acting user's avatar
 * @param {string|null} [notifData.postId] - Related post ID if applicable
 * @param {string|null} [notifData.postText] - Preview of post/reply text
 */
export async function createNotification(targetUid, notifData) {
  if (!targetUid || !notifData?.fromUid || targetUid === notifData.fromUid) {
    return null; // Don't notify self
  }

  try {
    const notifsRef = collection(db, "users", targetUid, "notifications");
    const docData = {
      type: notifData.type,
      fromUid: notifData.fromUid,
      fromName: notifData.fromName || "साधक",
      fromPhoto: notifData.fromPhoto || null,
      postId: notifData.postId || null,
      postText: notifData.postText ? notifData.postText.slice(0, 100) : null,
      read: false,
      createdAt: serverTimestamp()
    };

    const res = await addDoc(notifsRef, docData);
    return res.id;
  } catch (err) {
    console.warn("Notice: notification creation skipped:", err.message);
    return null;
  }
}

/**
 * Listens in real-time to a user's notifications.
 * @param {string} uid
 * @param {(notifs: Array<object>) => void} callback
 * @returns {() => void} Unsubscribe function
 */
export function listenNotifications(uid, callback) {
  if (!uid) return () => {};

  const q = query(
    collection(db, "users", uid, "notifications"),
    orderBy("createdAt", "desc"),
    limit(50)
  );

  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(items);
    },
    (err) => {
      console.warn("Notifications listener notice:", err.message);
      // Fallback query without orderBy if index is missing
      const fallbackQuery = query(
        collection(db, "users", uid, "notifications"),
        limit(50)
      );
      return onSnapshot(fallbackQuery, (fbSnap) => {
        const items = fbSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        items.sort((a, b) => {
          const tA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const tB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return tB - tA;
        });
        callback(items);
      });
    }
  );
}

/**
 * Listens in real-time to unread notification count.
 * @param {string} uid
 * @param {(count: number) => void} callback
 * @returns {() => void} Unsubscribe function
 */
export function listenUnreadCount(uid, callback) {
  if (!uid) return () => {};

  const q = query(
    collection(db, "users", uid, "notifications"),
    where("read", "==", false)
  );

  return onSnapshot(
    q,
    (snap) => {
      callback(snap.size);
    },
    (err) => {
      console.warn("Unread count listener notice:", err.message);
      callback(0);
    }
  );
}

/**
 * Marks a single notification as read.
 * @param {string} uid
 * @param {string} notifId
 */
export async function markNotificationRead(uid, notifId) {
  if (!uid || !notifId) return;
  try {
    const notifRef = doc(db, "users", uid, "notifications", notifId);
    await updateDoc(notifRef, { read: true });
  } catch (e) {
    console.warn("markNotificationRead notice:", e.message);
  }
}

/**
 * Marks all unread notifications as read.
 * @param {string} uid
 */
export async function markAllNotificationsRead(uid) {
  if (!uid) return;
  try {
    const q = query(
      collection(db, "users", uid, "notifications"),
      where("read", "==", false),
      limit(100)
    );
    const snap = await getDocs(q);
    if (snap.empty) return;

    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      batch.update(d.ref, { read: true });
    });
    await batch.commit();
  } catch (e) {
    console.warn("markAllNotificationsRead notice:", e.message);
  }
}
