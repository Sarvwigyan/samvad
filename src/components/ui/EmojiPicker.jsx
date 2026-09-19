import React, { useState, useRef, useEffect, useMemo } from "react";
import { SearchIcon, CloseIcon } from "./Icons";

const EMOJI_CATEGORIES = [
  {
    id: "smileys",
    label: "भाव",
    glyph: "😀",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇",
      "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚",
      "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔",
      "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥",
      "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮",
      "🤧", "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳", "😎", "🤓",
      "🧐", "😕", "😟", "🙁", "😮", "😯", "😲", "😳", "🥺", "😦",
      "😧", "😨", "😰", "😥", "😢", "😭", "😱", "😖", "😣", "😞",
      "😓", "😩", "😫", "🥱", "😤", "😡", "😠", "🤬", "😈", "👿"
    ]
  },
  {
    id: "gestures",
    label: "संकेत व हाथ",
    glyph: "🙏",
    emojis: [
      "🙏", "👍", "👎", "👏", "🙌", "👐", "🤲", "🤝", "👋", "🤚",
      "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘",
      "🤙", "👈", "👉", "👆", "👇", "☝️", "✊", "👊", "🤛", "🤜",
      "💪", "✍️", "💅", "🤳", "🧠", "🫀", "🫁", "👀", "👁️", "👅", "👄"
    ]
  },
  {
    id: "nature",
    label: "प्रकृति व दिव्यता",
    glyph: "🪷",
    emojis: [
      "🪷", "🕉️", "🪔", "🌸", "🌺", "🌻", "🌹", "🌷", "🌼", "🌾",
      "🌿", "☘️", "🍀", "🍁", "🍂", "🍃", "☀️", "🌙", "⭐", "🌟",
      "💫", "✨", "⚡", "🌈", "☁️", "🌧️", "❄️", "🌊", "🕊️", "🦚",
      "🐘", "🐄", "🐅", "🐆", "🐒", "🐍", "🦅", "🦜", "🐢", "🐬", "🦋"
    ]
  },
  {
    id: "food",
    label: "आहार",
    glyph: "🍎",
    emojis: [
      "🍎", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🍒", "🥭", "🍍",
      "🥥", "🥝", "🥑", "🌽", "🥕", "🥔", "🥐", "🍞", "🧀", "🍳",
      "🥞", "🍿", "🍚", "🍛", "🍜", "🍲", "🍦", "🍩", "🍪", "🎂",
      "🍫", "🍬", "🍭", "☕", "🍵", "🧃", "🥛"
    ]
  },
  {
    id: "activities",
    label: "उत्सव व क्रिया",
    glyph: "🎯",
    emojis: [
      "🎯", "🎨", "🎬", "🎤", "🎧", "🎷", "🎸", "🎹", "🎺", "🎻",
      "🥁", "🎪", "🎭", "🏆", "🥇", "🥈", "🥉", "🏅", "🎖️", "🏵️",
      "🎗️", "🎟️", "⚽", "🏀", "🏈", "⚾", "🎾", "🏏", "🏓", "🏸"
    ]
  },
  {
    id: "symbols",
    label: "प्रतीक व वस्तुएँ",
    glyph: "🔔",
    emojis: [
      "🔔", "🚩", "🔱", "📿", "📜", "🕯️", "📖", "📚", "✍️", "💡",
      "🔑", "🗝️", "🔒", "🔓", "❤️", "🧡", "💛", "💚", "💙", "💜",
      "🤎", "🖤", "🤍", "💔", "❤️‍🔥", "💯", "💢", "💥", "💫", "💬", "💭"
    ]
  }
];

export function EmojiPicker({ onSelect, onClose, align = "bottom" }) {
  const [activeCategory, setActiveCategory] = useState("smileys");
  const [searchQuery, setSearchQuery] = useState("");
  const pickerRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        onClose?.();
      }
    };
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const allFilteredEmojis = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase().trim();
    // Match against category names or return all emojis
    const matched = [];
    EMOJI_CATEGORIES.forEach((cat) => {
      if (cat.label.toLowerCase().includes(q)) {
        matched.push(...cat.emojis);
      }
    });
    return matched.length > 0 ? Array.from(new Set(matched)) : EMOJI_CATEGORIES.flatMap((c) => c.emojis);
  }, [searchQuery]);

  const currentCategoryObj = useMemo(() => {
    return EMOJI_CATEGORIES.find((c) => c.id === activeCategory) || EMOJI_CATEGORIES[0];
  }, [activeCategory]);

  const displayedEmojis = allFilteredEmojis || currentCategoryObj.emojis;

  return (
    <div
      ref={pickerRef}
      className={`universal-emoji-picker picker-align-${align}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="emoji-picker-header">
        <div className="emoji-search-box">
          <SearchIcon size={14} />
          <input
            type="text"
            placeholder="इमोजी खोजें..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="emoji-search-input"
            autoFocus
          />
          {searchQuery && (
            <button
              type="button"
              className="emoji-clear-btn"
              onClick={() => setSearchQuery("")}
            >
              <CloseIcon size={12} />
            </button>
          )}
        </div>
        {onClose && (
          <button type="button" className="emoji-close-btn" onClick={onClose} title="बंद करें">
            <CloseIcon size={14} />
          </button>
        )}
      </div>

      {/* Category Tabs */}
      {!searchQuery && (
        <div className="emoji-categories-tabs">
          {EMOJI_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`emoji-cat-tab ${activeCategory === cat.id ? "active" : ""}`}
              onClick={() => setActiveCategory(cat.id)}
              title={cat.label}
            >
              <span>{cat.glyph}</span>
            </button>
          ))}
        </div>
      )}

      {/* Emoji Grid */}
      <div className="emoji-grid-scroll">
        <div className="emoji-grid-title">
          {searchQuery ? `खोज परिणाम` : currentCategoryObj.label}
        </div>
        <div className="emoji-buttons-grid">
          {displayedEmojis.map((emoji, idx) => (
            <button
              key={idx}
              type="button"
              className="emoji-btn-item"
              onClick={() => {
                onSelect(emoji);
              }}
              title={emoji}
              aria-label={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
