/**
 * Formats a given Date or Firestore Timestamp into a concise relative time string.
 * Rules:
 *   - < 60s  -> "just now"
 *   - < 60m  -> "Nm ago"
 *   - < 24h  -> "Nh ago"
 *   - < 7d   -> "Nd ago"
 *   - else   -> Locale short date string
 *
 * Handles null / undefined timestamps gracefully (Firestore serverTimestamp()
 * is briefly null during local optimistic write before roundtrip confirmation).
 */
export function timeAgo(timestamp) {
  if (!timestamp) {
    return "just now";
  }

  let date;
  if (typeof timestamp.toDate === "function") {
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else if (typeof timestamp === "number") {
    date = new Date(timestamp);
  } else {
    return "just now";
  }

  const now = Date.now();
  const diffInSeconds = Math.max(0, Math.floor((now - date.getTime()) / 1000));

  if (diffInSeconds < 60) {
    return "just now";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined
  });
}
