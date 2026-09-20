import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FeedTabs, FEED_TAB_KEY, TAB_PRAVAH, TAB_NAYA } from "../../components/FeedTabs";

// Mock localStorage for Node environment
let store = {};
globalThis.localStorage = {
  getItem: (key) => store[key] || null,
  setItem: (key, val) => { store[key] = String(val); },
  removeItem: (key) => { delete store[key]; },
  clear: () => { store = {}; }
};

describe("Phase 4C: FeedTabs UI Component (FeedTabs.jsx)", () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  it("should define tab constants correctly", () => {
    expect(FEED_TAB_KEY).toBe("samwad_feed_tab");
    expect(TAB_PRAVAH).toBe("pravah");
    expect(TAB_NAYA).toBe("naya");
  });

  it("should render FeedTabs elements and labels correctly", () => {
    const el = FeedTabs({ activeTab: TAB_PRAVAH, onTabChange: () => {} });
    expect(el).toBeTruthy();
    expect(el.props.className).toBe("feed-tabs-container");

    const buttons = el.props.children;
    expect(buttons).toHaveLength(3);

    // Pravah button
    const pravahBtn = buttons[0];
    expect(pravahBtn.props["aria-selected"]).toBe(true);
    expect(pravahBtn.props.className).toContain("active");

    // Naya button
    const nayaBtn = buttons[1];
    expect(nayaBtn.props["aria-selected"]).toBe(false);
  });

  it("should trigger onTabChange and persist to localStorage on click", () => {
    const onTabChange = vi.fn();
    const el = FeedTabs({ activeTab: TAB_PRAVAH, onTabChange });
    const nayaBtn = el.props.children[1];

    // Simulate clicking Naya button
    nayaBtn.props.onClick();

    expect(onTabChange).toHaveBeenCalledWith(TAB_NAYA);
    expect(globalThis.localStorage.getItem(FEED_TAB_KEY)).toBe(TAB_NAYA);
  });

  it("should ignore click if tab is already active", () => {
    const onTabChange = vi.fn();
    const el = FeedTabs({ activeTab: TAB_PRAVAH, onTabChange });
    const pravahBtn = el.props.children[0];

    // Click already active tab
    pravahBtn.props.onClick();
    expect(onTabChange).not.toHaveBeenCalled();
  });
});
