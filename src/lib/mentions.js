import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export const MENTION_REGEX = /@([a-zA-Z0-9_]{3,20})/g;

/**
 * Extracts all unique usernames mentioned in text (without the @ symbol).
 * @param {string} text
 * @returns {string[]} Lowercase usernames
 */
export function extractMentions(text = "") {
  if (!text || typeof text !== "string") return [];
  const matches = text.match(MENTION_REGEX);
  if (!matches) return [];
  const names = matches.map((m) => m.slice(1).toLowerCase());
  return Array.from(new Set(names));
}

/**
 * Given a list of usernames, looks up their user profile UIDs in Firestore.
 * @param {string[]} usernames
 * @returns {Promise<Array<{ uid: string, username: string, displayName: string }>>}
 */
export async function lookupMentionedUsers(usernames = []) {
  if (!usernames || usernames.length === 0) return [];
  const cleaned = usernames.slice(0, 10).map((u) => u.toLowerCase().trim());
  const found = [];

  for (const name of cleaned) {
    try {
      const q = query(
        collection(db, "users"),
        where("username", "==", name)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0];
        found.push({ uid: d.id, ...d.data() });
      }
    } catch (e) {
      console.warn("Mention lookup notice:", e.message);
    }
  }

  return found;
}

/**
 * Searches users for mention autocomplete as user types after @.
 * @param {string} queryText
 * @param {number} limitCount
 * @returns {Promise<Array<{ uid: string, username: string, displayName: string, avatarUrl: string|null }>>}
 */
export async function searchUsersByMention(queryText = "", limitCount = 5) {
  try {
    const q = query(collection(db, "users"), limit(25));
    const snap = await getDocs(q);
    const users = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
    const cleanQuery = (queryText || "").toLowerCase().trim();

    const filtered = users.filter((u) => {
      if (!cleanQuery) return true;
      const uname = (u.username || "").toLowerCase();
      const dname = (u.displayName || "").toLowerCase();
      return uname.includes(cleanQuery) || dname.includes(cleanQuery);
    });

    return filtered.slice(0, limitCount);
  } catch (err) {
    console.warn("searchUsersByMention notice:", err.message);
    return [];
  }
}
