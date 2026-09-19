import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  listenConversations,
  listenMessages,
  sendDirectMessage,
  getOrCreateConversation,
  markConversationRead
} from "../lib/dm";
import { getUserProfile } from "../lib/firestore";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { timeAgo } from "../lib/timeAgo";
import { playTempleChime } from "../lib/chime";
import { triggerHaptic } from "../lib/haptics";
import {
  MailIcon,
  SendIcon,
  ProfileIcon,
  SearchIcon
} from "../components/ui/Icons";

export default function DirectMessages() {
  const { id: routeConvId } = useParams();
  const [searchParams] = useSearchParams();
  const targetWithUid = searchParams.get("with");
  const navigate = useNavigate();

  const { currentUser, userProfile, loginWithGoogle } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(routeConvId || null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [convSearch, setConvSearch] = useState("");

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Sync route param with activeConvId
  useEffect(() => {
    if (routeConvId) {
      setActiveConvId(routeConvId);
    }
  }, [routeConvId]);

  // Handle ?with=UID query from Profile page
  useEffect(() => {
    if (!currentUser || !targetWithUid) return;

    getUserProfile(targetWithUid).then(async (targetProf) => {
      if (!targetProf) return;
      try {
        const cId = await getOrCreateConversation(
          {
            uid: currentUser.uid,
            displayName: userProfile?.displayName || currentUser.displayName,
            avatarUrl: userProfile?.avatarUrl || currentUser.photoURL,
            username: userProfile?.username || "sadharak"
          },
          targetProf
        );
        setActiveConvId(cId);
        navigate(`/sandesh/${cId}`, { replace: true });
      } catch (err) {
        console.error("Error creating direct conversation:", err);
      }
    });
  }, [currentUser, targetWithUid, userProfile, navigate]);

  // Listen to all conversations for active user
  useEffect(() => {
    if (!currentUser) {
      setLoadingConvs(false);
      return;
    }

    const unsubscribe = listenConversations(currentUser.uid, (convList) => {
      setConversations(convList);
      setLoadingConvs(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Listen to messages of active conversation
  useEffect(() => {
    if (!activeConvId || !currentUser) {
      setMessages([]);
      return;
    }

    setLoadingMsgs(true);
    markConversationRead(activeConvId, currentUser.uid);

    const unsubscribe = listenMessages(activeConvId, (msgs) => {
      setMessages(msgs);
      setLoadingMsgs(false);
    });

    return () => unsubscribe();
  }, [activeConvId, currentUser]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSelectConversation = (cId) => {
    triggerHaptic(8);
    setActiveConvId(cId);
    navigate(`/sandesh/${cId}`);
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const clean = inputText.trim();
    if (!clean || !activeConvId || !currentUser) return;

    triggerHaptic(10);
    playTempleChime();
    setInputText("");

    const activeConv = conversations.find((c) => c.id === activeConvId);
    const targetUid = activeConv?.participants?.find((uid) => uid !== currentUser.uid);

    await sendDirectMessage(activeConvId, {
      senderUid: currentUser.uid,
      senderName: userProfile?.displayName || currentUser.displayName || "साधक",
      senderAvatar: userProfile?.avatarUrl || currentUser.photoURL || null,
      text: clean,
      targetUid
    });

    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!currentUser) {
    return (
      <div className="guest-prompt-page">
        <div className="guest-prompt-card">
          <span className="guest-lotus-badge"><MailIcon size={36} /></span>
          <h3>व्यक्तिगत संदेश (DMs) हेतु प्रवेश करें</h3>
          <p>अन्य साधकों के साथ सुरक्षित, व्यक्तिगत 1:1 संवाद हेतु कृपया गूगल से प्रवेश करें।</p>
          <Button variant="primary" size="md" onClick={loginWithGoogle}>
            गूगल से प्रवेश (Sign in with Google)
          </Button>
        </div>
      </div>
    );
  }

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const otherUid = activeConv?.participants?.find((p) => p !== currentUser.uid);
  const otherDetails = otherUid && activeConv?.participantDetails ? activeConv.participantDetails[otherUid] : null;

  const filteredConversations = convSearch
    ? conversations.filter((c) => {
        const otherId = c.participants?.find((p) => p !== currentUser.uid);
        const details = otherId && c.participantDetails ? c.participantDetails[otherId] : null;
        const query = convSearch.toLowerCase();
        return (
          details?.displayName?.toLowerCase().includes(query) ||
          details?.username?.toLowerCase().includes(query) ||
          c.lastMessage?.toLowerCase().includes(query)
        );
      })
    : conversations;

  return (
    <div className="dm-master-shell">
      {/* LEFT COLUMN: Conversation List */}
      <aside className={`dm-list-panel ${activeConvId ? "hide-on-mobile" : ""}`}>
        <header className="dm-list-header">
          <h2 className="dm-list-title">संदेश (Direct Messages)</h2>
          <div className="dm-search-box">
            <SearchIcon size={16} />
            <input
              type="text"
              placeholder="संवाद खोजें..."
              value={convSearch}
              onChange={(e) => setConvSearch(e.target.value)}
              className="dm-search-input"
            />
          </div>
        </header>

        <div className="dm-convs-scroll">
          {loadingConvs ? (
            <div className="dm-loading-box">
              <span className="lotus-spinner">☸</span>
              <p>संवाद लोड हो रहे हैं...</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="dm-empty-state">
              <span className="dm-empty-glyph"><MailIcon size={36} /></span>
              <h4>कोई सक्रिय संवाद नहीं</h4>
              <p>किसी भी साधक के परिचय पृष्ठ पर जाकर "संदेश" बटन दबाकर वार्ता प्रारंभ करें।</p>
            </div>
          ) : (
            <div className="dm-threads-list">
              {filteredConversations.map((conv) => {
                const partnerUid = conv.participants?.find((p) => p !== currentUser.uid);
                const partner = partnerUid && conv.participantDetails ? conv.participantDetails[partnerUid] : null;
                const unread = conv.unreadCount?.[currentUser.uid] || 0;
                const isSelected = conv.id === activeConvId;

                return (
                  <div
                    key={conv.id}
                    className={`dm-thread-item ${isSelected ? "active-thread" : ""} ${unread > 0 ? "has-unread" : ""}`}
                    onClick={() => handleSelectConversation(conv.id)}
                    role="button"
                    tabIndex={0}
                  >
                    <Avatar
                      src={partner?.avatarUrl}
                      alt={partner?.displayName || "साधक"}
                      size="md"
                      fallbackText={partner?.displayName || "साधक"}
                    />
                    <div className="dm-thread-info">
                      <div className="dm-thread-top">
                        <span className="dm-thread-name">{partner?.displayName || "सुधी साधक"}</span>
                        <time className="dm-thread-time">{timeAgo(conv.lastMessageAt)}</time>
                      </div>
                      <div className="dm-thread-bottom">
                        <p className="dm-thread-preview">
                          {conv.lastMessage || "संवाद प्रारंभ करें"}
                        </p>
                        {unread > 0 && (
                          <span className="dm-unread-badge">{unread}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* RIGHT COLUMN: Active Chat Room */}
      <section className={`dm-chat-panel ${!activeConvId ? "hide-on-mobile" : ""}`}>
        {activeConvId ? (
          <div className="dm-active-room">
            {/* Room Header */}
            <header className="dm-room-header">
              <button
                type="button"
                className="dm-back-btn mobile-only"
                onClick={() => {
                  setActiveConvId(null);
                  navigate("/sandesh");
                }}
                aria-label="वापस संवाद सूची"
              >
                ← वापस
              </button>

              <div className="dm-room-user-meta">
                <Avatar
                  src={otherDetails?.avatarUrl}
                  alt={otherDetails?.displayName}
                  size="sm"
                  fallbackText={otherDetails?.displayName}
                />
                <div className="dm-room-names">
                  <h3 className="dm-room-display-name">{otherDetails?.displayName || "सुधी साधक"}</h3>
                  <span className="dm-room-handle">@{otherDetails?.username || "sadharak"}</span>
                </div>
              </div>

              {otherUid && (
                <Link to={`/parichay/${otherUid}`} className="dm-view-profile-btn" title="परिचय देखें">
                  <ProfileIcon size={18} />
                </Link>
              )}
            </header>

            {/* Messages Scroll View */}
            <div className="dm-messages-viewport">
              {loadingMsgs ? (
                <div className="dm-loading-box">
                  <span className="lotus-spinner">☸</span>
                  <p>संदेश लोड हो रहे हैं...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="dm-chat-welcome">
                  <span className="welcome-lotus">☸</span>
                  <h4>संवाद का शुभारंभ करें</h4>
                  <p>आपके संदेश सुरक्षित व व्यक्तिगत हैं।</p>
                </div>
              ) : (
                <div className="dm-bubbles-list">
                  {messages.map((msg) => {
                    const isMine = msg.senderUid === currentUser.uid;
                    return (
                      <div
                        key={msg.id}
                        className={`dm-bubble-row ${isMine ? "is-mine" : "is-partner"}`}
                      >
                        {!isMine && (
                          <Avatar
                            src={msg.senderAvatar || otherDetails?.avatarUrl}
                            alt={msg.senderName}
                            size="xs"
                            fallbackText={msg.senderName}
                            className="dm-bubble-avatar"
                          />
                        )}
                        <div className="dm-bubble-container">
                          <div className={`dm-bubble ${isMine ? "bubble-mine" : "bubble-partner"}`}>
                            <p className="dm-bubble-text">{msg.text}</p>
                          </div>
                          <time className="dm-bubble-time">{timeAgo(msg.createdAt)}</time>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Message Input Box */}
            <footer className="dm-input-tray">
              <form className="dm-send-form" onSubmit={handleSendMessage}>
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="संदेश लिखें... (Enter दबाकर भेजें)"
                  className="dm-input-field"
                  maxLength={1000}
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!inputText.trim()}
                  className="dm-send-btn"
                  title="संदेश प्रेषित करें"
                >
                  <SendIcon size={16} />
                </Button>
              </form>
            </footer>
          </div>
        ) : (
          <div className="dm-no-active-selection">
            <span className="no-select-glyph"><MailIcon size={54} /></span>
            <h3>संदेश चुनें अथवा नया संवाद प्रारंभ करें</h3>
            <p>बाईं सूची से किसी संवाद का चयन करें अथवा किसी साधक के परिचय पृष्ठ से वार्ता शुरू करें।</p>
          </div>
        )}
      </section>
    </div>
  );
}
