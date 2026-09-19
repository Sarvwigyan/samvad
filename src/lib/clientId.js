const STORAGE_KEY = "x_clone_client_id";

/**
 * Returns a persistent anonymous client UUID stored in localStorage.
 * Used exclusively for server-side / future rate-limiting, NEVER shown in UI.
 * Wrapped in try/catch to safely accommodate private browsing and restricted storage modes.
 */
export function getClientId() {
  try {
    let clientId = localStorage.getItem(STORAGE_KEY);
    if (!clientId) {
      if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        clientId = crypto.randomUUID();
      } else {
        clientId = "client-" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      }
      localStorage.setItem(STORAGE_KEY, clientId);
    }
    return clientId;
  } catch (err) {
    // In restricted or disabled storage contexts (e.g. strict private browsing), generate fallback
    return "ephemeral-" + Math.random().toString(36).substring(2, 15);
  }
}
