import React from "react";
import { triggerHaptic } from "../lib/haptics";

export const FEED_TAB_KEY = "samwad_feed_tab";
export const TAB_PRAVAH = "pravah";
export const TAB_NAYA = "naya";

/**
 * Tab switcher component for Pravah (For You) and Naya (Latest).
 * Follows tactile 3D button system and preserves choice in localStorage.
 *
 * @param {object} props
 * @param {string} props.activeTab - 'pravah' | 'naya'
 * @param {Function} props.onTabChange - Callback on tab switch
 */
export function FeedTabs({ activeTab, onTabChange }) {
  const handleSelect = (tab) => {
    if (tab === activeTab) return;
    triggerHaptic(12);
    try {
      localStorage.setItem(FEED_TAB_KEY, tab);
    } catch (e) {}
    onTabChange(tab);
  };

  return (
    <div className="feed-tabs-container" role="tablist" aria-label="विचार प्रवाह प्रकार">
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === TAB_PRAVAH}
        className={`feed-tab-btn ${activeTab === TAB_PRAVAH ? "active" : ""}`}
        onClick={() => handleSelect(TAB_PRAVAH)}
      >
        <span className="tab-label-main">प्रवाह</span>
        <span className="tab-label-sub">Pravah (For You)</span>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={activeTab === TAB_NAYA}
        className={`feed-tab-btn ${activeTab === TAB_NAYA ? "active" : ""}`}
        onClick={() => handleSelect(TAB_NAYA)}
      >
        <span className="tab-label-main">नया</span>
        <span className="tab-label-sub">Naya (Latest)</span>
      </button>
    </div>
  );
}
