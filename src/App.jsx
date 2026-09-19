import React, { useState, useEffect, useRef } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  serverTimestamp
} from "firebase/firestore";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import { db, auth, googleProvider } from "./firebase";
import { getClientId } from "./lib/clientId";
import { timeAgo } from "./lib/timeAgo";
import { playTempleChime } from "./lib/chime";

const BHAV_CATEGORIES = [
  { id: "vichar", label: "💡 दर्शन / विचार", short: "दर्शन" },
  { id: "adhyatma", label: "🕉️ अध्यात्म / भक्ति", short: "अध्यात्म" },
  { id: "suvichar", label: "🌸 सुविचार / प्रेरणा", short: "सुविचार" },
  { id: "jigyasa", label: "❓ जिज्ञासा / प्रश्न", short: "जिज्ञासा" },
  { id: "gyan", label: "📜 विद्या / ज्ञान", short: "ज्ञान" }
];

export default function App() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [selectedBhav, setSelectedBhav] = useState(BHAV_CATEGORIES[0].short);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);

  const feedTopRef = useRef(null);
  const textareaRef = useRef(null);

  // Monitor Google Authentication State
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  // Real-time Firestore messages subscription
  useEffect(() => {
    const messagesQuery = query(
      collection(db, "messages"),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsubscribeMessages = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));
        setMessages(docs);
        setIsInitialLoading(false);
        setErrorMessage("");
      },
      (error) => {
        console.error("Firestore listener subscription error:", error);
        setIsInitialLoading(false);
        setErrorMessage(
          "विचार-प्रवाह से संपर्क स्थापित नहीं हो सका। कृपया नेटवर्क अथवा सुरक्षा नियम जाँचें।"
        );
      }
    );

    return () => unsubscribeMessages();
  }, []);

  // Auto-scroll on new message
  useEffect(() => {
    if (feedTopRef.current) {
      feedTopRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  const handleGoogleSignIn = async () => {
    setErrorMessage("");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Google Sign-In Error:", err);
      if (err.code !== "auth/popup-closed-by-user") {
        setErrorMessage(
          "गूगल प्रवेश असफल रहा: " + (err.message || "कृपया पुनः प्रयास करें।")
        );
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Sign-Out Error:", err);
    }
  };

  const trimmedText = inputText.trim();
  const charCount = inputText.length;
  const isTooLong = charCount > 500;
  const isSendDisabled = isSending || trimmedText.length === 0 || isTooLong || !currentUser;

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (isSendDisabled) return;

    setIsSending(true);
    setErrorMessage("");

    try {
      const authorName = isAnonymous
        ? "साधक (गुप्त)"
        : (currentUser.displayName || "सुधी पाठक");
      const authorPhoto = isAnonymous ? null : currentUser.photoURL;

      await addDoc(collection(db, "messages"), {
        text: trimmedText,
        bhav: selectedBhav,
        authorName: authorName,
        authorPhoto: authorPhoto,
        isAnonymous: isAnonymous,
        uid: currentUser.uid,
        createdAt: serverTimestamp(),
        clientId: getClientId()
      });

      // Play bell chime on successful dispatch
      if (isSoundEnabled) {
        playTempleChime();
      }

      setInputText("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch (err) {
      console.error("Error creating message document:", err);
      setErrorMessage(
        "संदेश प्रेषित नहीं हो सका। सुनिश्चित करें कि फायरबेस में सुरक्षा नियम अद्यतन हैं।"
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e) => {
    setInputText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
  };

  return (
    <div className="vedic-layout">
      {/* Sacred Header with Om Insignia and Vedic Motif */}
      <header className="vedic-header">
        <div className="header-top">
          <div className="brand-zone">
            <div className="om-crest">
              <span className="om-symbol">ॐ</span>
              <div className="om-glow-ring"></div>
            </div>
            <div className="brand-text">
              <div className="title-row">
                <h1 className="brand-title">संवाद</h1>
                <span className="brand-tag">SAMWAD</span>
              </div>
              <p className="brand-subtitle">भारतीय विचार-प्रवाह • Sovereign Sanskrit Feed</p>
            </div>
          </div>

          <div className="header-actions">
            <button
              type="button"
              className={`sound-toggle ${isSoundEnabled ? "sound-active" : ""}`}
              onClick={() => setIsSoundEnabled(!isSoundEnabled)}
              title={isSoundEnabled ? "घंटा नाद चालू है (Mute)" : "घंटा नाद बंद है (Unmute)"}
              aria-label="Toggle bell audio"
            >
              {isSoundEnabled ? "🔔" : "🔕"}
            </button>

            {!isAuthLoading && (
              currentUser ? (
                <div className="user-profile-badge">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || "User"}
                      className="user-avatar"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="user-avatar-fallback">🪷</div>
                  )}
                  <div className="user-info">
                    <span className="user-name">{currentUser.displayName?.split(" ")[0] || "प्रयोक्ता"}</span>
                    <span className="user-status-dot">प्रमाणित</span>
                  </div>
                  <button
                    type="button"
                    className="signout-btn"
                    onClick={handleSignOut}
                    title="प्रस्थान (Sign Out)"
                  >
                    प्रस्थान
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="google-signin-btn-compact"
                  onClick={handleGoogleSignIn}
                >
                  <svg className="google-icon" viewBox="0 0 24 24" width="16" height="16">
                    <path fill="#EA4335" d="M12 5c1.5 0 2.8.5 3.9 1.5l2.9-2.9C17 2 14.6 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.3 8.8 5 12 5z"/>
                    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"/>
                    <path fill="#FBBC05" d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.7 0-1.2.2-2 .4-2.7L1.6 6.4C.6 8.3 0 10.5 0 12.8s.6 4.5 1.6 6.4l3.7-4.5z"/>
                    <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.2 0-5.8-2.3-6.7-5.3L1.6 17c1.9 3.8 5.8 6.4 10.4 6.4z"/>
                  </svg>
                  <span>गूगल प्रवेश</span>
                </button>
              )
            )}
          </div>
        </div>

        {/* Auspicious Shloka Ribbon */}
        <div className="shloka-ribbon">
          <span className="shloka-flourish">✦</span>
          <span className="shloka-text">सत्यं वद • धर्मं चर • वसुधैव कुटुम्बकम्</span>
          <span className="shloka-flourish">✦</span>
        </div>
      </header>

      {/* Error / Notification Banner */}
      {errorMessage && (
        <div className="vedic-alert-banner" role="alert">
          <span className="alert-icon">⚠️</span>
          <span className="alert-text">{errorMessage}</span>
          <button
            className="alert-dismiss"
            onClick={() => setErrorMessage("")}
            aria-label="Dismiss alert"
          >
            ×
          </button>
        </div>
      )}

      {/* Live Stream of Messages */}
      <main className="vedic-feed">
        <div ref={feedTopRef} />

        {isInitialLoading ? (
          <div className="feed-status-state">
            <div className="vedic-loader">
              <span className="loader-om">ॐ</span>
            </div>
            <p className="status-title">विचार-प्रवाह से जुड़ रहे हैं...</p>
            <p className="status-desc">कृपया क्षण भर प्रतीक्षा करें</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="feed-status-state">
            <div className="empty-lotus">🪷</div>
            <p className="status-title">प्रवाह में प्रथम विचार प्रस्तुत करें</p>
            <p className="status-desc">यह प्रांगण शुभ विचारों के आदान-प्रदान के लिए समर्पित है।</p>
          </div>
        ) : (
          <div className="messages-stream">
            {messages.map((item) => (
              <article key={item.id} className="vedic-message-card">
                <header className="card-header">
                  <div className="card-author-info">
                    {item.authorPhoto && !item.isAnonymous ? (
                      <img
                        src={item.authorPhoto}
                        alt={item.authorName}
                        className="author-avatar-img"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="author-avatar-badge">
                        <span>{item.isAnonymous ? "🪷" : "ॐ"}</span>
                      </div>
                    )}
                    <div className="author-details">
                      <span className="author-name">
                        {item.authorName || "साधक (Anonymous)"}
                      </span>
                      {item.isAnonymous ? (
                        <span className="author-subtext">साधक • गुप्त विचार</span>
                      ) : (
                        <span className="author-subtext">सत्यापित विचारवान</span>
                      )}
                    </div>
                  </div>

                  <div className="card-meta">
                    {item.bhav && (
                      <span className="bhav-pill">
                        {item.bhav}
                      </span>
                    )}
                    <time className="card-timestamp">
                      {timeAgo(item.createdAt)}
                    </time>
                  </div>
                </header>

                <div className="card-body">
                  <p className="card-content">{item.text}</p>
                </div>

                <footer className="card-footer">
                  <span className="card-divider-motif">✦ ॐ ✦</span>
                </footer>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Advanced Message Sender / Composer (Fixed at Bottom) */}
      <footer className="vedic-composer">
        {currentUser ? (
          <form className="composer-active-form" onSubmit={handleSend}>
            {/* Bhav & Identity Selection Row */}
            <div className="composer-toolbar">
              <div className="bhav-selector" role="radiogroup" aria-label="Select Category">
                {BHAV_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`bhav-btn ${selectedBhav === cat.short ? "bhav-selected" : ""}`}
                    onClick={() => setSelectedBhav(cat.short)}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="identity-toggle-wrapper">
                <button
                  type="button"
                  className={`identity-btn ${isAnonymous ? "id-anon" : "id-named"}`}
                  onClick={() => setIsAnonymous(!isAnonymous)}
                  title="पहचान बदलें (Toggle Identity)"
                >
                  {isAnonymous ? "🪷 गुप्त (Anonymous)" : "🪪 आत्म-पहचान"}
                </button>
              </div>
            </div>

            {/* Dynamic Textarea */}
            <div className="textarea-box">
              <textarea
                ref={textareaRef}
                className={`vedic-textarea ${isTooLong ? "textarea-limit-exceeded" : ""}`}
                placeholder="मन के कल्याणकारी विचारों को प्रवाह में व्यक्त करें... (Ctrl+Enter)"
                value={inputText}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                rows={1}
                maxLength={600}
                disabled={isSending}
                aria-label="संदेश लिखें"
              />
            </div>

            {/* Bottom Controls */}
            <div className="composer-bottom-bar">
              <div className="char-progress">
                <div
                  className={`char-bar-inner ${isTooLong ? "bar-exceeded" : ""}`}
                  style={{ width: `${Math.min((charCount / 500) * 100, 100)}%` }}
                ></div>
                <span className={`char-number ${isTooLong ? "char-over" : ""}`}>
                  {charCount} / 500
                </span>
              </div>

              <button
                type="submit"
                className="vedic-send-button"
                disabled={isSendDisabled}
                aria-busy={isSending}
              >
                {isSending ? (
                  <>
                    <span className="send-spinner"></span>
                    <span>प्रेषित...</span>
                  </>
                ) : (
                  <>
                    <span>उद्घोष करें</span>
                    <span className="send-glyph">🔱</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="composer-locked-card">
            <div className="locked-content">
              <div className="locked-crest">🕉️</div>
              <div className="locked-text">
                <p className="locked-title">विचार प्रेषित करने हेतु गूगल से प्रवेश आवश्यक है</p>
                <p className="locked-subtitle">
                  प्रवेश के उपरांत आप अपनी पहचान अथवा गुप्त साधक के रूप में विचार व्यक्त कर सकते हैं।
                </p>
              </div>
            </div>
            <button
              type="button"
              className="google-signin-btn-large"
              onClick={handleGoogleSignIn}
            >
              <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
                <path fill="#EA4335" d="M12 5c1.5 0 2.8.5 3.9 1.5l2.9-2.9C17 2 14.6 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.3 8.8 5 12 5z"/>
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"/>
                <path fill="#FBBC05" d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.7 0-1.2.2-2 .4-2.7L1.6 6.4C.6 8.3 0 10.5 0 12.8s.6 4.5 1.6 6.4l3.7-4.5z"/>
                <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.2 0-5.8-2.3-6.7-5.3L1.6 17c1.9 3.8 5.8 6.4 10.4 6.4z"/>
              </svg>
              <span>गूगल से प्रवेश करें (Sign in with Google)</span>
            </button>
          </div>
        )}
      </footer>
    </div>
  );
}