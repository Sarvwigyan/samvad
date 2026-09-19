import React, { useState, useRef, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { createVichar } from "../lib/firestore";
import { playTempleChime } from "../lib/chime";
import { getClientId } from "../lib/clientId";
import { validatePostText, countWords, MAX_POST_WORDS } from "../lib/validation";
import { classifyVichar, BHAV_CATEGORIES } from "../lib/nlp";
import { compressPostImage } from "../lib/storage";
import { searchUsersByMention } from "../lib/mentions";
import { Button } from "./ui/Button";
import { Avatar } from "./ui/Avatar";
import { ImageIcon, CloseIcon, SmileIcon } from "./ui/Icons";
import { EmojiPicker } from "./ui/EmojiPicker";

export function PostComposer({ onPostCreated }) {
  const { currentUser, userProfile, loginWithGoogle } = useAuth();
  const [text, setText] = useState("");
  const [images, setImages] = useState([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [manualBhavId, setManualBhavId] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [mentionQuery, setMentionQuery] = useState(null);
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [selectedMentionIdx, setSelectedMentionIdx] = useState(0);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const isSubmittingRef = useRef(false);

  // Smart dynamic classification
  const autoBhav = useMemo(() => classifyVichar(text), [text]);
  const activeBhav = useMemo(() => {
    if (manualBhavId) {
      const found = Object.values(BHAV_CATEGORIES).find((c) => c.id === manualBhavId);
      if (found) return found;
    }
    return autoBhav;
  }, [manualBhavId, autoBhav]);

  const wordCount = useMemo(() => countWords(text), [text]);
  const charCount = text.length;
  const isOverLimit = wordCount > MAX_POST_WORDS;
  const isSendDisabled = isSending || isCompressing || (text.trim().length === 0 && images.length === 0) || isOverLimit;

  const handleImageSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = 4 - images.length;
    if (remaining <= 0) {
      setError("अधिकतम 4 चित्र ही संलग्न किए जा सकते हैं");
      return;
    }
    const selected = files.slice(0, remaining);
    setIsCompressing(true);
    setError("");
    try {
      const compressedList = await Promise.all(selected.map((f) => compressPostImage(f)));
      setImages((prev) => [...prev, ...compressedList].slice(0, 4));
    } catch (err) {
      console.error("Image compression error:", err);
      setError("चित्र संपीड़न में त्रुटि हुई। कृपया पुनः प्रयास करें।");
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (isSubmittingRef.current || isSending || isCompressing) return;

    if (!currentUser) {
      setError("विचार प्रेषित करने हेतु गूगल से प्रवेश आवश्यक है");
      return;
    }

    const trimmed = text.trim();
    if (!trimmed && images.length === 0) {
      setError("विचार अथवा चित्र अनिवार्य है");
      return;
    }

    if (trimmed && wordCount > MAX_POST_WORDS) {
      setError(`विचार अधिकतम ${MAX_POST_WORDS} शब्दों तक ही सीमित है (वर्तमान: ${wordCount} शब्द)`);
      return;
    }

    isSubmittingRef.current = true;
    setIsSending(true);
    setError("");

    try {
      const newPost = await createVichar({
        authorId: currentUser.uid,
        authorName: userProfile?.displayName || currentUser.displayName || "सुधी साधक",
        authorPhoto: userProfile?.avatarUrl || currentUser.photoURL || null,
        text: trimmed || "(चित्र विचार)",
        bhav: activeBhav.short,
        isAnonymous,
        images,
        clientId: getClientId()
      });

      playTempleChime();
      setText("");
      setImages([]);
      setManualBhavId(null);
      setIsDropdownOpen(false);
      setIsEmojiOpen(false);
      setMentionQuery(null);
      setMentionSuggestions([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      if (onPostCreated) {
        onPostCreated(newPost);
      }
    } catch (err) {
      console.error("Post creation error:", err);
      setError("विचार प्रेषित नहीं हो सका। कृपया नेटवर्क अथवा सुरक्षा नियम जाँचें।");
    } finally {
      setIsSending(false);
      isSubmittingRef.current = false;
    }
  };

  const handleKeyDown = (e) => {
    // Keyboard navigation for @mention suggestions
    if (mentionQuery !== null && mentionSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedMentionIdx((prev) => (prev + 1) % mentionSuggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedMentionIdx((prev) => (prev - 1 + mentionSuggestions.length) % mentionSuggestions.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const picked = mentionSuggestions[selectedMentionIdx] || mentionSuggestions[0];
        if (picked) handleSelectMention(picked);
        return;
      }
      if (e.key === "Escape") {
        setMentionQuery(null);
        setMentionSuggestions([]);
        return;
      }
    }

    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setText(val);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;

    // Detect @mention trigger at cursor
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);
    const match = textBeforeCursor.match(/@([a-zA-Z0-9_]*)$/);

    if (match) {
      const q = match[1];
      setMentionQuery(q);
      searchUsersByMention(q, 5).then((results) => {
        setMentionSuggestions(results);
      }).catch(() => {
        setMentionSuggestions([]);
      });
    } else {
      setMentionQuery(null);
      setMentionSuggestions([]);
    }
  };

  const handleSelectMention = (user) => {
    if (!textareaRef.current) return;
    const cursorPos = textareaRef.current.selectionStart;
    const textBeforeCursor = text.slice(0, cursorPos);
    const textAfterCursor = text.slice(cursorPos);

    const replacedBefore = textBeforeCursor.replace(/@([a-zA-Z0-9_]*)$/, `@${user.username} `);
    const newText = replacedBefore + textAfterCursor;
    setText(newText);
    setMentionQuery(null);
    setMentionSuggestions([]);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPos = replacedBefore.length;
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 10);
  };

  const handleEmojiSelect = (emoji) => {
    if (!textareaRef.current) {
      setText((prev) => prev + emoji);
      return;
    }
    const start = textareaRef.current.selectionStart ?? text.length;
    const end = textareaRef.current.selectionEnd ?? text.length;
    const newText = text.slice(0, start) + emoji + text.slice(end);
    setText(newText);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPos = start + emoji.length;
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 10);
  };

  if (!currentUser) {
    return (
      <div className="composer-guest-card">
        <div className="guest-card-left">
          <span className="guest-lotus" style={{ fontSize: "1.6rem" }}>☸</span>
          <div>
            <h4 className="guest-title">विचार साझा करने हेतु गूगल से प्रवेश करें</h4>
            <p className="guest-subtitle">प्रवेश के उपरांत आप अपनी पहचान अथवा गुप्त साधक के रूप में विचार व्यक्त कर सकते हैं।</p>
          </div>
        </div>
        <Button variant="primary" size="md" onClick={loginWithGoogle}>
          गूगल प्रवेश (Sign in with Google)
        </Button>
      </div>
    );
  }

  return (
    <form className="post-composer-card" onSubmit={handleSubmit}>
      {/* Smart Apple-Liquid Header Row */}
      <div className="composer-header-row">
        {/* Real-Time Smart Bhav Classifier Pill */}
        <div className="smart-bhav-wrapper">
          <button
            type="button"
            className="smart-bhav-pill"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            title="क्लिक करके श्रेणी बदलें"
            aria-label="भाव श्रेणी"
          >
            <span className="smart-bhav-spark">✦</span>
            <span className="smart-bhav-glyph">{activeBhav.glyph}</span>
            <span className="smart-bhav-text">{activeBhav.label}</span>
            <span className="smart-bhav-badge">
              {manualBhavId ? "निर्धारित" : "स्वतः विश्लेषित"}
            </span>
            <span className="smart-bhav-caret">▾</span>
          </button>

          {/* Optional manual override popover */}
          {isDropdownOpen && (
            <div className="smart-bhav-dropdown">
              <div className="dropdown-header-note">श्रेणी चुनें अथवा एआई को स्वतः विश्लेषण करने दें:</div>
              {Object.values(BHAV_CATEGORIES).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`dropdown-cat-item ${activeBhav.id === cat.id ? "selected" : ""}`}
                  onClick={() => {
                    setManualBhavId(cat.id);
                    setIsDropdownOpen(false);
                  }}
                >
                  <span className="dropdown-cat-glyph">{cat.glyph}</span>
                  <span className="dropdown-cat-label">{cat.label}</span>
                  {activeBhav.id === cat.id && <span className="dropdown-check">✓</span>}
                </button>
              ))}
              {manualBhavId && (
                <button
                  type="button"
                  className="dropdown-reset-btn"
                  onClick={() => {
                    setManualBhavId(null);
                    setIsDropdownOpen(false);
                  }}
                >
                  ↺ एआई स्वतः-विश्लेषण पर पुनः सेट करें
                </button>
              )}
            </div>
          )}
        </div>

        {/* Identity Switcher */}
        <button
          type="button"
          className={`identity-switch ${isAnonymous ? "anon-active" : ""}`}
          onClick={() => setIsAnonymous(!isAnonymous)}
          title="पहचान का प्रकार बदलें"
        >
          {isAnonymous ? "गुप्त विचार" : "आत्म-पहचान"}
        </button>
      </div>

      {/* Avatar + Textarea Row */}
      <div className="composer-body-layout">
        <Avatar
          src={isAnonymous ? null : (userProfile?.avatarUrl || currentUser.photoURL)}
          alt={userProfile?.displayName || currentUser.displayName}
          size="md"
          fallbackText={isAnonymous ? "साधक" : (userProfile?.displayName || currentUser.displayName)}
        />
        <div className="composer-textarea-box">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className={`composer-textarea ${isOverLimit ? "has-error" : ""}`}
            placeholder="कल्याणकारी विचारों को प्रवाह में व्यक्त करें... #हैशटैग अथवा @साधक का प्रयोग करें (Ctrl + Enter)"
            rows={2}
            maxLength={600}
            disabled={isSending}
            aria-label="विचार लिखें"
          />

          {/* Mention Suggestions Popover */}
          {mentionQuery !== null && mentionSuggestions.length > 0 && (
            <div className="composer-mention-suggestions">
              <div className="mention-suggestion-header">
                <span>साधक उल्लेख (@Mention)</span>
              </div>
              <div className="mention-suggestion-list">
                {mentionSuggestions.map((u) => (
                  <button
                    key={u.uid}
                    type="button"
                    className="mention-suggestion-item"
                    onClick={() => handleSelectMention(u)}
                  >
                    <Avatar
                      src={u.avatarUrl}
                      alt={u.displayName || u.username}
                      size="sm"
                      fallbackText={u.displayName || u.username}
                    />
                    <div className="mention-item-info">
                      <span className="mention-item-name">{u.displayName || "सुधी साधक"}</span>
                      <span className="mention-item-handle">@{u.username}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Attached Images Preview Grid (X-style 1-4 images) */}
      {images.length > 0 && (
        <div className={`composer-image-grid img-grid-${images.length}`}>
          {images.map((imgSrc, idx) => (
            <div key={idx} className="composer-preview-item">
              <img src={imgSrc} alt={`संलग्न चित्र ${idx + 1}`} className="composer-thumb-img" />
              <button
                type="button"
                className="composer-remove-img-btn"
                onClick={() => removeImage(idx)}
                title="चित्र हटाएँ"
                aria-label="चित्र हटाएँ"
              >
                <CloseIcon size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {isCompressing && (
        <div className="composer-compressing-banner">
          <span className="btn-spinner" aria-hidden="true" />
          <span>चित्र संपीड़न व अनुकूलन जारी है...</span>
        </div>
      )}

      {error && <p className="composer-error-msg">⚠️ {error}</p>}

      {/* Actions & Meter */}
      <div className="composer-footer-row">
        <div className="composer-tools-left">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            multiple
            style={{ display: "none" }}
            id="composer-file-input"
          />
          <button
            type="button"
            className="composer-action-icon-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={images.length >= 4 || isCompressing}
            title={images.length >= 4 ? "अधिकतम 4 चित्र संलग्न हो चुके हैं" : "चित्र संलग्न करें (अधिकतम 4)"}
            aria-label="चित्र संलग्न करें"
          >
            <ImageIcon size={19} />
            {images.length > 0 && <span className="media-badge-pill">{images.length}/4</span>}
          </button>

          {/* Emoji Trigger */}
          <div className="composer-emoji-trigger-wrap" style={{ position: "relative" }}>
            <button
              type="button"
              className={`composer-action-icon-btn ${isEmojiOpen ? "active" : ""}`}
              onClick={() => setIsEmojiOpen(!isEmojiOpen)}
              title="इमोजी जोड़ें (Emoji)"
              aria-label="इमोजी जोड़ें"
            >
              <SmileIcon size={19} />
            </button>
            {isEmojiOpen && (
              <EmojiPicker
                onSelect={(emoji) => handleEmojiSelect(emoji)}
                onClose={() => setIsEmojiOpen(false)}
                align="top"
              />
            )}
          </div>
        </div>

        <div className="composer-footer-right">
          <div className="composer-meter">
            <div
              className={`meter-fill ${isOverLimit ? "fill-exceeded" : ""}`}
              style={{ width: `${Math.min((wordCount / MAX_POST_WORDS) * 100, 100)}%` }}
            />
            <span className={`meter-text ${isOverLimit ? "text-danger" : ""}`} title={`${charCount} अक्षर`}>
              {wordCount} / {MAX_POST_WORDS} शब्द
            </span>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isSendDisabled}
            loading={isSending || isCompressing}
          >
            विचार प्रेषित करें (Post)
          </Button>
        </div>
      </div>
    </form>
  );
}
