import {
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  increment
} from "firebase/firestore";
import { db } from "../firebase";

/**
 * Generates a deterministic conversation ID for two users.
 * E.g. "uidA_uidB" (sorted alphabetically).
 * @param {string} uidA
 * @param {string} uidB
 * @returns {string}
 */
export function getConversationId(uidA, uidB) {
  return [uidA, uidB].sort().join("_");
}

/**
 * Gets or initializes a 1:1 conversation between two users.
 * @param {object} currentUser - { uid, displayName, avatarUrl, username }
 * @param {object} targetUser - { uid, displayName, avatarUrl, username }
 * @returns {Promise<string>} Conversation ID
 */
export async function getOrCreateConversation(currentUser, targetUser) {
  if (!currentUser?.uid || !targetUser?.uid || currentUser.uid === targetUser.uid) {
    throw new Error("वैध प्रयोक्ता पहचान अनिवार्य है");
  }

  const convId = getConversationId(currentUser.uid, targetUser.uid);
  const convRef = doc(db, "conversations", convId);

  const existing = await getDoc(convRef);
  if (!existing.exists()) {
    await setDoc(convRef, {
      participants: [currentUser.uid, targetUser.uid],
      participantDetails: {
        [currentUser.uid]: {
          displayName: currentUser.displayName || "साधक",
          avatarUrl: currentUser.avatarUrl || null,
          username: currentUser.username || "sadharak"
        },
        [targetUser.uid]: {
          displayName: targetUser.displayName || "साधक",
          avatarUrl: targetUser.avatarUrl || null,
          username: targetUser.username || "sadharak"
        }
      },
      lastMessage: "",
      lastMessageAt: serverTimestamp(),
      lastSenderUid: "",
      unreadCount: {
        [currentUser.uid]: 0,
        [targetUser.uid]: 0
      },
      createdAt: serverTimestamp()
    });
  }

  return convId;
}

/**
 * Sends a message in a conversation.
 * @param {string} convId
 * @param {object} param1
 * @param {string} param1.senderUid
 * @param {string} param1.senderName
 * @param {string|null} param1.senderAvatar
 * @param {string} param1.text
 * @param {string} param1.targetUid
 */
export async function sendDirectMessage(convId, { senderUid, senderName, senderAvatar, text, targetUid }) {
  if (!convId || !senderUid || !text?.trim()) return;

  const cleanText = text.trim();
  const convRef = doc(db, "conversations", convId);
  const messagesRef = collection(db, "conversations", convId, "messages");

  // 1. Add message document
  await addDoc(messagesRef, {
    senderUid,
    senderName: senderName || "साधक",
    senderAvatar: senderAvatar || null,
    text: cleanText,
    createdAt: serverTimestamp(),
    read: false
  });

  // 2. Update conversation header
  const updatePayload = {
    lastMessage: cleanText.length > 80 ? cleanText.slice(0, 77) + "..." : cleanText,
    lastMessageAt: serverTimestamp(),
    lastSenderUid: senderUid
  };

  if (targetUid) {
    updatePayload[`unreadCount.${targetUid}`] = increment(1);
  }

  try {
    await updateDoc(convRef, updatePayload);
  } catch (e) {
    console.warn("Update conversation header notice:", e.message);
  }
}

/**
 * Listens to all active conversations for a user.
 * @param {string} uid
 * @param {(conversations: Array<object>) => void} callback
 * @returns {() => void}
 */
export function listenConversations(uid, callback) {
  if (!uid) return () => {};

  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", uid)
  );

  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      // Sort client-side by lastMessageAt descending
      items.sort((a, b) => {
        const tA = a.lastMessageAt?.toDate ? a.lastMessageAt.toDate().getTime() : 0;
        const tB = b.lastMessageAt?.toDate ? b.lastMessageAt.toDate().getTime() : 0;
        return tB - tA;
      });
      callback(items);
    },
    (err) => {
      console.warn("Conversations listener notice:", err.message);
      callback([]);
    }
  );
}

/**
 * Listens to messages within an active conversation.
 * @param {string} convId
 * @param {(messages: Array<object>) => void} callback
 * @returns {() => void}
 */
export function listenMessages(convId, callback) {
  if (!convId) return () => {};

  const q = query(
    collection(db, "conversations", convId, "messages"),
    orderBy("createdAt", "asc"),
    limit(100)
  );

  return onSnapshot(
    q,
    (snap) => {
      const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(msgs);
    },
    (err) => {
      console.warn("Messages listener notice, falling back to unordered:", err.message);
      const fbQuery = query(
        collection(db, "conversations", convId, "messages"),
        limit(100)
      );
      return onSnapshot(fbQuery, (fbSnap) => {
        const msgs = fbSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        msgs.sort((a, b) => {
          const tA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const tB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return tA - tB;
        });
        callback(msgs);
      });
    }
  );
}

/**
 * Clears unread count for the active user on a conversation.
 * @param {string} convId
 * @param {string} uid
 */
export async function markConversationRead(convId, uid) {
  if (!convId || !uid) return;
  try {
    const convRef = doc(db, "conversations", convId);
    await updateDoc(convRef, {
      [`unreadCount.${uid}`]: 0
    });
  } catch (e) {
    // Non-blocking
  }
}

/**
 * Toggles an emoji reaction on a message in a conversation.
 * @param {string} convId
 * @param {string} messageId
 * @param {string} emoji
 * @param {object} user - { uid, displayName }
 */
export async function toggleMessageReaction(convId, messageId, emoji, { uid, displayName }) {
  if (!convId || !messageId || !emoji || !uid) return;
  try {
    const msgRef = doc(db, "conversations", convId, "messages", messageId);
    const snap = await getDoc(msgRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const reactions = { ...(data.reactions || {}) };

    if (reactions[uid]?.emoji === emoji) {
      delete reactions[uid];
    } else {
      reactions[uid] = {
        emoji,
        displayName: displayName || "साधक",
        timestamp: Date.now()
      };
    }

    await updateDoc(msgRef, { reactions });
  } catch (err) {
    console.warn("toggleMessageReaction notice:", err.message);
  }
}

/**
 * Hides a message for the current user ("Delete for me").
 * @param {string} convId
 * @param {string} messageId
 * @param {string} uid
 */
export async function deleteMessageForMe(convId, messageId, uid) {
  if (!convId || !messageId || !uid) return;
  try {
    const msgRef = doc(db, "conversations", convId, "messages", messageId);
    const snap = await getDoc(msgRef);
    if (!snap.exists()) return;

    const currentDeleted = snap.data().deletedFor || [];
    if (!currentDeleted.includes(uid)) {
      await updateDoc(msgRef, {
        deletedFor: [...currentDeleted, uid]
      });
    }
  } catch (err) {
    console.warn("deleteMessageForMe notice:", err.message);
  }
}

/**
 * Tombstones a message for all participants ("Delete for everyone").
 * Only the message sender can execute this.
 * @param {string} convId
 * @param {string} messageId
 * @param {string} uid
 */
export async function deleteMessageForEveryone(convId, messageId, uid) {
  if (!convId || !messageId || !uid) return;
  try {
    const msgRef = doc(db, "conversations", convId, "messages", messageId);
    const snap = await getDoc(msgRef);
    if (!snap.exists()) return;

    if (snap.data().senderUid !== uid) {
      throw new Error("केवल प्रेषक ही सभी के लिए संदेश हटा सकता है");
    }

    await updateDoc(msgRef, {
      deletedForEveryone: true,
      text: "यह संदेश हटा दिया गया है",
      reactions: {}
    });
  } catch (err) {
    console.warn("deleteMessageForEveryone notice:", err.message);
    throw err;
  }
}
