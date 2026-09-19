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
import { db } from "./firebase";
import { getClientId } from "./lib/clientId";
import { timeAgo } from "./lib/timeAgo";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const feedTopRef = useRef(null);
  const textareaRef = useRef(null);

  // FR-1: Subscribe to real-time updates from Firestore on mount
  useEffect(() => {
    // Limit strictly to 50 docs ordered by createdAt descending
    // The limit(50) prevents excessive Firestore read quota consumption.
    const messagesQuery = query(
      collection(db, "messages"),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    // Attach real-time snapshot listener
    const unsubscribe = onSnapshot(
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
          "Failed to connect to live message feed. Check Firebase credentials and security rules."
        );
      }
    );

    // Clean up subscription on unmount to avoid listener leaks and quota waste
    return () => unsubscribe();
  }, []);

  // Auto-scroll list container to top when new messages arrive
  useEffect(() => {
    if (feedTopRef.current) {
      feedTopRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const trimmedText = inputText.trim();
  const charCount = inputText.length;
  const isTooLong = charCount > 500;
  const isSendDisabled = isSending || trimmedText.length === 0 || isTooLong;

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (isSendDisabled) return;

    setIsSending(true);
    setErrorMessage("");

    try {
      // FR-4: Document contains EXACTLY text, createdAt, and clientId.
      // MUST use serverTimestamp() so that client cannot spoof post timestamps.
      await addDoc(collection(db, "messages"), {
        text: trimmedText,
        createdAt: serverTimestamp(),
        clientId: getClientId()
      });

      // Clear input only on success
      setInputText("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch (err) {
      console.error("Error creating message document:", err);
      // Keep user input text so nothing is lost, surface clear message
      setErrorMessage(
        err.message || "Failed to post message. Please check your network connection."
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    // Allow Ctrl+Enter or Cmd+Enter to send quickly
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e) => {
    setInputText(e.target.value);
    // Dynamic height resize
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
  };

  return (
    <div className="app-layout">
      {/* App Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="brand">
            <h1 className="brand-title">Samvad</h1>
            <span className="brand-badge">Phase 1</span>
          </div>
          <div className="anonymous-indicator">
            <span className="dot-live"></span>
            <span className="indicator-label">Posting as: <strong>Anonymous</strong></span>
          </div>
        </div>
      </header>

      {/* Error / Offline Alert Banner */}
      {errorMessage && (
        <div className="error-banner" role="alert">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{errorMessage}</span>
          <button
            className="error-dismiss-btn"
            onClick={() => setErrorMessage("")}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Message Board Feed */}
      <main className="feed-container">
        <div ref={feedTopRef} />

        {isInitialLoading ? (
          <div className="feed-empty-state">
            <div className="loading-spinner"></div>
            <p>Connecting to live stream...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="feed-empty-state">
            <p className="empty-title">No messages yet.</p>
            <p className="empty-subtitle">Be the first person to share a message anonymously.</p>
          </div>
        ) : (
          <div className="message-list">
            {messages.map((item) => (
              <article key={item.id} className="message-card">
                <div className="message-body">{item.text}</div>
                <footer className="message-meta">
                  <time className="message-timestamp">
                    {timeAgo(item.createdAt)}
                  </time>
                </footer>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Composer Row pinned at bottom */}
      <footer className="composer-container">
        <form className="composer-form" onSubmit={handleSend}>
          <div className="composer-input-wrapper">
            <textarea
              ref={textareaRef}
              className={`composer-textarea ${isTooLong ? "textarea-error" : ""}`}
              placeholder="What is happening? Share anonymously..."
              value={inputText}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              rows={1}
              maxLength={600}
              aria-label="Write an anonymous message"
              disabled={isSending}
            />
          </div>

          <div className="composer-actions">
            <span className={`char-counter ${isTooLong ? "counter-over" : ""}`}>
              {charCount} / 500
            </span>
            <button
              type="submit"
              className="send-button"
              disabled={isSendDisabled}
              aria-busy={isSending}
            >
              {isSending ? "Sending..." : "Send"}
            </button>
          </div>
        </form>
      </footer>
    </div>
  );
}