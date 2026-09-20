/**
 * Local Drafts (कच्चा प्रारूप) System for Samwad
 * Allows users to save, resume, and manage unfinished posts locally in localStorage/IndexedDB.
 */

const DRAFTS_KEY = "samwad_post_drafts";
const MAX_DRAFTS = 20;

/**
 * Retrieves all saved drafts, sorted newest first.
 * @returns {Array<object>}
 */
export function getDrafts() {
  try {
    const raw = localStorage.getItem(DRAFTS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.sort((a, b) => b.savedAt - a.savedAt) : [];
  } catch (e) {
    console.warn("Failed to read drafts:", e);
    return [];
  }
}

/**
 * Saves or updates a draft.
 * @param {object} draftData
 * @param {string} [draftData.id]
 * @param {string} draftData.text
 * @param {Array<string>} [draftData.images]
 * @param {string|null} [draftData.audioDataUrl]
 * @param {object|null} [draftData.poll]
 * @param {boolean} [draftData.isAnonymous]
 * @param {string} [draftData.bhav]
 * @param {object|null} [draftData.linkCard]
 * @returns {object} The saved draft
 */
export function saveDraft(draftData) {
  try {
    const drafts = getDrafts();
    const id = draftData.id || `draft_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    
    const entry = {
      id,
      text: draftData.text || "",
      images: draftData.images || [],
      audioDataUrl: draftData.audioDataUrl || null,
      poll: draftData.poll || null,
      isAnonymous: Boolean(draftData.isAnonymous),
      bhav: draftData.bhav || "विचार",
      linkCard: draftData.linkCard || null,
      savedAt: Date.now()
    };

    const filtered = drafts.filter((d) => d.id !== id);
    const updated = [entry, ...filtered].slice(0, MAX_DRAFTS);
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(updated));
    return entry;
  } catch (e) {
    console.error("Failed to save draft:", e);
    return null;
  }
}

/**
 * Deletes a draft by ID.
 * @param {string} draftId
 * @returns {boolean}
 */
export function deleteDraft(draftId) {
  try {
    const drafts = getDrafts();
    const updated = drafts.filter((d) => d.id !== draftId);
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(updated));
    return true;
  } catch (e) {
    console.warn("Failed to delete draft:", e);
    return false;
  }
}

/**
 * Clears all drafts.
 */
export function clearAllDrafts() {
  try {
    localStorage.removeItem(DRAFTS_KEY);
  } catch (e) {}
}
