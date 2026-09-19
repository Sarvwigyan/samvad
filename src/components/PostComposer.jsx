import React, { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { createVichar } from "../lib/firestore";
import { playTempleChime } from "../lib/chime";
import { getClientId } from "../lib/clientId";
import { validatePostText } from "../lib/validation";
import { Button } from "./ui/Button";

const BHAV_OPTIONS = [
  { id: "vichar", label: "💡 दर्शन / विचार", short: "दर्शन" },
  { id: "adhyatma", label: "🪷 अध्यात्म / चिंतन", short: "अध्यात्म" },
  { id: "suvichar", label: "🌸 सुविचार / नीति", short: "सुविचार" },
  { id: "jigyasa", label: "❓ जिज्ञासा / प्रश्न", short: "जिज्ञासा" },
  { id: "gyan", label: "📜 विद्या / ज्ञान", short: "ज्ञान" }
];

export function PostComposer({ onPostCreated }) {
  const { currentUser, userProfile, loginWithGoogle } = useAuth();
  const [text, setText] = useState("");
  const [selectedBhav, setSelectedBhav] = useState(BHAV_OPTIONS[0].short);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef(null);

  const charCount = text.length;
  const isOverLimit = charCount > 500;
  const isSendDisabled = isSending || text.trim().length === 0 || isOverLimit;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!currentUser) {
      setError("विचार प्रेषित करने हेतु गूगल से प्रवेश आवश्यक है");
      return;
    }

    const val = validatePostText(text);
    if (!val.valid) {
      setError(val.error);
      return;
    }

    setIsSending(true);
    setError("");

    try {
      const newPost = await createVichar({
        authorId: currentUser.uid,
        authorName: userProfile?.displayName || currentUser.displayName || "सुधी साधक",
        authorPhoto: userProfile?.avatarUrl || currentUser.photoURL || null,
        text: val.sanitized,
        bhav: selectedBhav,
        isAnonymous,
        clientId: getClientId()
      });

      playTempleChime();
      setText("");
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
      {/* Bhav Category Selection */}
      <div className="composer-header-row">
        <div className="bhav-pill-group" role="radiogroup" aria-label="भाव चुनें">
          {BHAV_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`bhav-select-btn ${selectedBhav === opt.short ? "active" : ""}`}
              onClick={() => setSelectedBhav(opt.short)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className={`identity-switch ${isAnonymous ? "anon-active" : ""}`}
          onClick={() => setIsAnonymous(!isAnonymous)}
          title="पहचान का प्रकार बदलें"
        >
          {isAnonymous ? "🪷 गुप्त विचार (Anonymous)" : "🪪 आत्म-पहचान"}
        </button>
      </div>

      {/* Input Field */}
      <div className="composer-textarea-box">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className={`composer-textarea ${isOverLimit ? "has-error" : ""}`}
          placeholder="कल्याणकारी विचारों को प्रवाह में व्यक्त करें... (Ctrl + Enter)"
          rows={2}
          maxLength={600}
          disabled={isSending}
          aria-label="विचार लिखें"
        />
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
