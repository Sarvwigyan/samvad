import React, { useState, useRef, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { createVichar } from "../lib/firestore";
import { playTempleChime } from "../lib/chime";
import { getClientId } from "../lib/clientId";
import { validatePostText } from "../lib/validation";
import { classifyVichar, BHAV_CATEGORIES } from "../lib/nlp";
import { Button } from "./ui/Button";
import { Avatar } from "./ui/Avatar";

export function PostComposer({ onPostCreated }) {
  const { currentUser, userProfile, loginWithGoogle } = useAuth();
  const [text, setText] = useState("");
  const [manualBhavId, setManualBhavId] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef(null);
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

  const charCount = text.length;
  const isOverLimit = charCount > 500;
  const isSendDisabled = isSending || text.trim().length === 0 || isOverLimit;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (isSubmittingRef.current || isSending) return;

    if (!currentUser) {
      setError("विचार प्रेषित करने हेतु गूगल से प्रवेश आवश्यक है");
      return;
    }

    const val = validatePostText(text);
    if (!val.valid) {
      setError(val.error);
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
        text: val.sanitized,
        bhav: activeBhav.short,
        isAnonymous,
        clientId: getClientId()
      });

      playTempleChime();
      setText("");
      setManualBhavId(null);
      setIsDropdownOpen(false);
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
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e) => {
    setText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
  };

  if (!currentUser) {
    return (
      <div className="composer-guest-card">
        <div className="guest-card-left">
          <span className="guest-lotus">🪷</span>
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
          {isAnonymous ? "🪷 गुप्त विचार" : "🪪 आत्म-पहचान"}
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
            placeholder="कल्याणकारी विचारों को प्रवाह में व्यक्त करें... #हैशटैग का प्रयोग करें (Ctrl + Enter)"
            rows={2}
            maxLength={600}
            disabled={isSending}
            aria-label="विचार लिखें"
          />
        </div>
      </div>

      {error && <p className="composer-error-msg">⚠️ {error}</p>}

      {/* Actions & Meter */}
      <div className="composer-footer-row">
        <div className="composer-meter">
          <div
            className={`meter-fill ${isOverLimit ? "fill-exceeded" : ""}`}
            style={{ width: `${Math.min((charCount / 500) * 100, 100)}%` }}
          />
          <span className={`meter-text ${isOverLimit ? "text-danger" : ""}`}>
            {charCount} / 500
          </span>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={isSendDisabled}
          loading={isSending}
        >
          विचार प्रेषित करें (Post)
        </Button>
      </div>
    </form>
  );
}
