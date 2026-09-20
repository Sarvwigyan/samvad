import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  listenConversations,
  listenMessages,
  sendDirectMessage,
  voteDmPoll,
  getOrCreateConversation,
  markConversationRead,
  toggleMessageReaction,
  deleteMessageForMe,
  deleteMessageForEveryone
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
  SearchIcon,
  SmileIcon,
  MoreHorizontalIcon,
  TrashIcon,
  MicIcon,
  StopCircleIcon,
  ChartIcon,
  CloseIcon
} from "../components/ui/Icons";
import { EmojiPicker } from "../components/ui/EmojiPicker";

function resolveOptionText(opt) {
  if (!opt) return "";
  if (typeof opt === "string") return opt;
  if (typeof opt.text === "string") return opt.text;
  if (typeof opt.text === "object" && opt.text !== null) return resolveOptionText(opt.text);
  return String(opt.text || opt.title || "");
}

function formatDmTime(ts) {
  if (!ts) return "";
  const d = ts?.toDate ? ts.toDate() : ts instanceof Date ? ts : typeof ts === "number" ? new Date(ts) : null;
  if (!d || isNaN(d.getTime())) return timeAgo(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

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
  const [isInputEmojiOpen, setIsInputEmojiOpen] = useState(false);
  const [activeReactionMenuMsgId, setActiveReactionMenuMsgId] = useState(null);
  const [activeMsgMenuId, setActiveMsgMenuId] = useState(null);
  const [activeFullPickerMsgId, setActiveFullPickerMsgId] = useState(null);
  const [pickerPlacement, setPickerPlacement] = useState("top");
  const [convSearch, setConvSearch] = useState("");

  // Audio / Voice note states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioDataUrl, setAudioDataUrl] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const streamRef = useRef(null);

  // Poll states
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);

  // Cleanup timer & audio stream on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 16000 });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result.length > 950000) {
            alert("ध्वनि संदेश बहुत बड़ा है (1MB सीमा)। कृपया छोटा संदेश भेजें।");
          } else {
            setAudioDataUrl(reader.result);
          }
          stream.getTracks().forEach((track) => track.stop());
        };
        reader.readAsDataURL(blob);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
      triggerHaptic(10);
    } catch (err) {
      console.error("Audio recording error:", err);
      alert("माइक्रोफ़ोन अनुमति अस्वीकृत या अनुपलब्ध है।");
    }
  };

  const stopRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      triggerHaptic(10);
    }
  };

  const cancelRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stream?.getTracks().forEach((track) => track.stop());
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      audioChunksRef.current = [];
      setAudioDataUrl(null);
      triggerHaptic(8);
    }
  };

  const clearAudio = () => {
    setAudioDataUrl(null);
  };

  const handlePollOptionChange = (index, val) => {
    const updated = [...pollOptions];
    updated[index] = val;
    setPollOptions(updated);
  };

  const addPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, ""]);
    }
  };

  const removePollOption = (index) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const clearPoll = () => {
    setShowPollCreator(false);
    setPollQuestion("");
    setPollOptions(["", ""]);
  };

  const handleVoteDmPoll = async (msgId, optionIndex) => {
    if (!activeConvId || !currentUser) return;
    triggerHaptic(10);
    try {
      await voteDmPoll(activeConvId, msgId, optionIndex, currentUser.uid);
    } catch (err) {
      console.error("Failed to vote in DM poll:", err);
    }
  };

  const handleInputEmojiSelect = (emoji) => {
    if (!inputRef.current) {
      setInputText((prev) => prev + emoji);
      return;
    }
    const start = inputRef.current.selectionStart ?? inputText.length;
    const end = inputRef.current.selectionEnd ?? inputText.length;
    const newText = inputText.slice(0, start) + emoji + inputText.slice(end);
    setInputText(newText);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newPos = start + emoji.length;
        inputRef.current.setSelectionRange(newPos, newPos);
      }
    }, 10);
  };

  const handleReact = async (msgId, emoji) => {
    if (!activeConvId || !currentUser) return;
    triggerHaptic(8);
    setActiveReactionMenuMsgId(null);
    setActiveFullPickerMsgId(null);
    await toggleMessageReaction(activeConvId, msgId, emoji, {
      uid: currentUser.uid,
      displayName: userProfile?.displayName || currentUser.displayName
    });
  };

  const handleDeleteForMe = async (msgId) => {
    if (!activeConvId || !currentUser) return;
    triggerHaptic(10);
    setActiveMsgMenuId(null);
    await deleteMessageForMe(activeConvId, msgId, currentUser.uid);
  };

  const handleDeleteForEveryone = async (msgId) => {
    if (!activeConvId || !currentUser) return;
    triggerHaptic(10);
    setActiveMsgMenuId(null);
    try {
      await deleteMessageForEveryone(activeConvId, msgId, currentUser.uid);
    } catch (e) {
      alert("संदेश हटाया नहीं जा सका: " + e.message);
    }
  };

  const visibleMessages = messages.filter(
    (m) => !m.deletedFor?.includes(currentUser?.uid)
  );

  const messagesViewportRef = useRef(null);
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

  // Auto-scroll messages viewport to bottom strictly inside container, never scrolling the page/window
  useEffect(() => {
    if (messagesViewportRef.current) {
      messagesViewportRef.current.scrollTop = messagesViewportRef.current.scrollHeight;
    }
  }, [messages]);

  // Keep window at top when opening DMs so headers are never cut off
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeConvId]);

  const handleSelectConversation = (cId) => {
    triggerHaptic(8);
    setActiveConvId(cId);
    navigate(`/sandesh/${cId}`);
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const clean = inputText.trim();
    const validPollOptions = pollOptions.filter((o) => o.trim());
    const hasValidPoll = showPollCreator && pollQuestion.trim() && validPollOptions.length >= 2;

    if (!clean && !audioDataUrl && !hasValidPoll) return;
    if (!activeConvId || !currentUser) return;

    triggerHaptic(10);
    playTempleChime();

    const activeConv = conversations.find((c) => c.id === activeConvId);
    const targetUid = activeConv?.participants?.find((uid) => uid !== currentUser.uid);

    const payload = {
      senderUid: currentUser.uid,
      senderName: userProfile?.displayName || currentUser.displayName || "साधक",
      senderAvatar: userProfile?.avatarUrl || currentUser.photoURL || null,
      text: clean,
      targetUid
    };

    if (audioDataUrl) {
      payload.audioData = audioDataUrl;
    }

    if (hasValidPoll) {
      payload.poll = {
        question: pollQuestion.trim(),
        options: validPollOptions.map((text) => text.trim()),
        totalVotes: 0
      };
    }

    setInputText("");
    setAudioDataUrl(null);
    clearPoll();

    await sendDirectMessage(activeConvId, payload);
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
    <div className={`dm-master-shell ${activeConvId ? "has-active-chat" : ""}`}>
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
            <div className="dm-messages-viewport" ref={messagesViewportRef}>
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
                  {visibleMessages.map((msg) => {
                    const isMine = msg.senderUid === currentUser.uid;
                    const isDeleted = msg.deletedForEveryone;

                    // Group reactions
                    const reactionMap = {};
                    if (msg.reactions) {
                      Object.entries(msg.reactions).forEach(([uid, r]) => {
                        if (!r?.emoji) return;
                        if (!reactionMap[r.emoji]) {
                          reactionMap[r.emoji] = { count: 0, users: [], emoji: r.emoji };
                        }
                        reactionMap[r.emoji].count += 1;
                        reactionMap[r.emoji].users.push(r.displayName || "साधक");
                      });
                    }
                    const groupedReactions = Object.values(reactionMap);

                    return (
                      <div
                        key={msg.id}
                        className={`dm-bubble-row ${isMine ? "is-mine" : "is-partner"} ${isDeleted ? "is-deleted" : ""}`}
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
                          {/* Main Bubble */}
                          <div className={`dm-bubble ${isMine ? "bubble-mine" : "bubble-partner"} ${isDeleted ? "bubble-deleted" : ""}`}>
                            {isDeleted ? (
                              <p className="dm-bubble-text text-deleted">🚫 <em>यह संदेश हटा दिया गया है</em></p>
                            ) : (
                              <>
                                {msg.text && <p className="dm-bubble-text">{msg.text}</p>}

                                {/* Voice Message Player */}
                                {msg.audioData && (
                                  <div className="dm-bubble-audio-box">
                                    <audio
                                      controls
                                      src={msg.audioData}
                                      preload="metadata"
                                      className="dm-bubble-audio-player"
                                    />
                                  </div>
                                )}

                                {/* Interactive Poll in DM */}
                                {msg.poll && (
                                  <div className="dm-bubble-poll-card">
                                    <p className="dm-poll-card-question">
                                      📊 {typeof msg.poll.question === "string" ? msg.poll.question : "मतदान"}
                                    </p>
                                    <div className="dm-poll-options-stack">
                                      {(() => {
                                        const userVotedIndex = msg.poll.voters?.[currentUser.uid] !== undefined
                                          ? msg.poll.voters[currentUser.uid]
                                          : msg.poll.options?.findIndex((o) =>
                                              Array.isArray(o?.voters) && o.voters.includes(currentUser.uid)
                                            );
                                        const hasVoted = userVotedIndex !== -1 && userVotedIndex !== undefined;
                                        const totalVotes =
                                          typeof msg.poll.totalVotes === "number"
                                            ? msg.poll.totalVotes
                                            : msg.poll.options?.reduce((sum, o) => sum + (typeof o?.votes === "number" ? o.votes : 0), 0) ||
                                              0;

                                        return msg.poll.options?.map((opt, optIdx) => {
                                          const votes = typeof opt?.votes === "number" ? opt.votes : 0;
                                          const percent = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                                          const isSelected = userVotedIndex === optIdx;
                                          const optText = resolveOptionText(opt);

                                          return (
                                            <button
                                              key={optIdx}
                                              type="button"
                                              className={`dm-poll-option-btn ${isSelected ? "selected" : ""} ${hasVoted ? "has-voted" : ""}`}
                                              onClick={() => !hasVoted && handleVoteDmPoll(msg.id, optIdx)}
                                              disabled={hasVoted}
                                            >
                                              {hasVoted && (
                                                <div
                                                  className="dm-poll-bar-fill"
                                                  style={{ width: `${percent}%` }}
                                                />
                                              )}
                                              <div className="dm-poll-opt-content">
                                                <span className="dm-poll-opt-name">
                                                  {optText} {isSelected && "✓"}
                                                </span>
                                                {hasVoted && (
                                                  <span className="dm-poll-opt-pct">{percent}%</span>
                                                )}
                                              </div>
                                            </button>
                                          );
                                        });
                                      })()}
                                    </div>
                                    <div className="dm-poll-card-footer">
                                      <span>{typeof msg.poll.totalVotes === "number" ? msg.poll.totalVotes : 0} मत (Votes)</span>
                                    </div>
                                  </div>
                                )}
                              {/* WhatsApp style footer with time & double tick */}
                              <div className="dm-bubble-footer">
                                <span className="dm-bubble-time-text">
                                  {formatDmTime(msg.createdAt)}
                                </span>
                                {isMine && !isDeleted && (
                                  <span className="dm-meta-ticks" title="पहुँचा">✓✓</span>
                                )}
                              </div>
                            </>
                          )}

                            {/* Floating Action Buttons (Hover/Touch) */}
                            {!isDeleted && (
                              <div className="dm-bubble-actions">
                                {/* React Button */}
                                <button
                                  type="button"
                                  className="dm-bubble-action-btn"
                                  onClick={(e) => {
                                    const rect = e.currentTarget.closest(".dm-bubble-row")?.getBoundingClientRect();
                                    if (rect && rect.top < 320) {
                                      setPickerPlacement("bottom");
                                    } else {
                                      setPickerPlacement("top");
                                    }
                                    setActiveReactionMenuMsgId(activeReactionMenuMsgId === msg.id ? null : msg.id);
                                    setActiveMsgMenuId(null);
                                  }}
                                  title="प्रतिक्रिया (React)"
                                >
                                  <SmileIcon size={14} />
                                </button>

                                {/* 3-Dot Options Button */}
                                <button
                                  type="button"
                                  className="dm-bubble-action-btn"
                                  onClick={() => {
                                    setActiveMsgMenuId(activeMsgMenuId === msg.id ? null : msg.id);
                                    setActiveReactionMenuMsgId(null);
                                  }}
                                  title="विकल्प"
                                >
                                  <MoreHorizontalIcon size={14} />
                                </button>
                              </div>
                            )}

                            {/* Quick Reaction Bar (WhatsApp / Arattai Style) */}
                            {activeReactionMenuMsgId === msg.id && activeFullPickerMsgId !== msg.id && (
                              <div className={`dm-reaction-bar-popup ${pickerPlacement === "bottom" ? "placement-bottom" : ""}`}>
                                {["👍", "❤️", "😂", "😮", "😢", "🙏", "🪷"].map((em) => (
                                  <button
                                    key={em}
                                    type="button"
                                    className="dm-quick-react-btn"
                                    onClick={() => handleReact(msg.id, em)}
                                  >
                                    {em}
                                  </button>
                                ))}
                                <button
                                  type="button"
                                  className="dm-quick-react-btn plus-btn"
                                  onClick={(e) => {
                                    const rect = e.currentTarget.closest(".dm-bubble-row")?.getBoundingClientRect();
                                    if (rect && rect.top < 320) {
                                      setPickerPlacement("bottom");
                                    } else {
                                      setPickerPlacement("top");
                                    }
                                    setActiveReactionMenuMsgId(null);
                                    setActiveFullPickerMsgId(activeFullPickerMsgId === msg.id ? null : msg.id);
                                  }}
                                  title="अन्य इमोजी..."
                                >
                                  ➕
                                </button>
                              </div>
                            )}

                            {/* Full Emoji Picker for Reaction */}
                            {activeFullPickerMsgId === msg.id && (
                              <div className={`dm-reaction-full-picker-wrap ${pickerPlacement === "bottom" ? "placement-bottom" : ""}`}>
                                <EmojiPicker
                                  onSelect={(em) => handleReact(msg.id, em)}
                                  onClose={() => {
                                    setActiveFullPickerMsgId(null);
                                    setActiveReactionMenuMsgId(null);
                                  }}
                                  align={pickerPlacement === "bottom" ? "bottom" : "top"}
                                />
                              </div>
                            )}

                            {/* Message 3-Dot Options Dropdown */}
                            {activeMsgMenuId === msg.id && (
                              <div className="dm-msg-dropdown">
                                <button
                                  type="button"
                                  className="dm-msg-dropdown-item"
                                  onClick={() => handleDeleteForMe(msg.id)}
                                >
                                  <TrashIcon size={13} />
                                  <span>मेरे लिए हटाएँ (Delete for me)</span>
                                </button>

                                {isMine && !isDeleted && (
                                  <button
                                    type="button"
                                    className="dm-msg-dropdown-item item-danger"
                                    onClick={() => handleDeleteForEveryone(msg.id)}
                                  >
                                    <TrashIcon size={13} />
                                    <span>सभी के लिए हटाएँ (Delete for everyone)</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Reaction Badges Below Bubble */}
                          {groupedReactions.length > 0 && !isDeleted && (
                            <div className="dm-reactions-badge-row">
                              {groupedReactions.map((gr) => {
                                const hasMine = msg.reactions?.[currentUser?.uid]?.emoji === gr.emoji;
                                return (
                                  <button
                                    key={gr.emoji}
                                    type="button"
                                    className={`dm-reaction-pill-badge ${hasMine ? "active-mine" : ""}`}
                                    onClick={() => handleReact(msg.id, gr.emoji)}
                                    title={gr.users.join(", ")}
                                  >
                                    <span>{gr.emoji}</span>
                                    {gr.count > 1 && <span className="pill-count">{gr.count}</span>}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Message Input Box */}
            <footer className="dm-input-tray">
              {/* Active Voice Recording Indicator */}
              {isRecording && (
                <div className="dm-recording-tray">
                  <div className="dm-recording-live-indicator">
                    <span className="dm-recording-dot" />
                    <span className="dm-recording-timer">{formatDuration(recordingDuration)}</span>
                    <span className="dm-recording-label">ध्वनि संदेश रिकॉर्ड हो रहा है...</span>
                  </div>
                  <div className="dm-recording-ctrls">
                    <button
                      type="button"
                      className="dm-rec-btn-cancel"
                      onClick={cancelRecording}
                    >
                      रद्द करें
                    </button>
                    <button
                      type="button"
                      className="dm-rec-btn-stop"
                      onClick={stopRecording}
                    >
                      <StopCircleIcon size={16} />
                      <span>पूर्ण</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Audio Preview Drawer (Recorded & ready to send) */}
              {audioDataUrl && !isRecording && (
                <div className="dm-audio-preview-tray">
                  <span className="dm-preview-mic-icon"><MicIcon size={18} /></span>
                  <audio controls src={audioDataUrl} className="dm-preview-audio-player" />
                  <button
                    type="button"
                    className="dm-preview-clear-btn"
                    onClick={clearAudio}
                    title="ऑडियो हटाएँ"
                  >
                    <TrashIcon size={16} />
                  </button>
                </div>
              )}

              {/* Poll Creator Drawer */}
              {showPollCreator && (
                <div className="dm-poll-creator-tray">
                  <div className="dm-poll-creator-top">
                    <span className="dm-poll-creator-title">
                      <ChartIcon size={16} /> जनमत संग्रह (Poll)
                    </span>
                    <button
                      type="button"
                      className="dm-poll-close-btn"
                      onClick={clearPoll}
                      title="रद्द करें"
                    >
                      <CloseIcon size={14} />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="प्रश्न पूछें... (उदा. क्या आप सहमत हैं?)"
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    className="dm-poll-question-input"
                    maxLength={150}
                  />
                  <div className="dm-poll-options-grid">
                    {pollOptions.map((opt, i) => (
                      <div key={i} className="dm-poll-opt-input-wrap">
                        <input
                          type="text"
                          placeholder={`विकल्प ${i + 1}`}
                          value={opt}
                          onChange={(e) => handlePollOptionChange(i, e.target.value)}
                          className="dm-poll-opt-input"
                          maxLength={60}
                        />
                        {pollOptions.length > 2 && (
                          <button
                            type="button"
                            className="dm-poll-remove-opt-btn"
                            onClick={() => removePollOption(i)}
                            title="विकल्प हटाएँ"
                          >
                            <CloseIcon size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {pollOptions.length < 4 && (
                    <button
                      type="button"
                      className="dm-poll-add-btn"
                      onClick={addPollOption}
                    >
                      + विकल्प जोड़ें (Add option)
                    </button>
                  )}
                </div>
              )}

              <form className="dm-send-form" onSubmit={handleSendMessage}>
                {/* Emoji Picker in Chat Input */}
                <div className="dm-input-emoji-wrap" style={{ position: "relative" }}>
                  <button
                    type="button"
                    className={`dm-input-tool-btn ${isInputEmojiOpen ? "active" : ""}`}
                    onClick={() => setIsInputEmojiOpen(!isInputEmojiOpen)}
                    title="इमोजी जोड़ें (Emoji)"
                    aria-label="इमोजी जोड़ें"
                  >
                    <SmileIcon size={20} />
                  </button>
                  {isInputEmojiOpen && (
                    <EmojiPicker
                      onSelect={(emoji) => handleInputEmojiSelect(emoji)}
                      onClose={() => setIsInputEmojiOpen(false)}
                      align="top"
                    />
                  )}
                </div>

                {/* Poll Trigger Button */}
                <button
                  type="button"
                  className={`dm-input-tool-btn ${showPollCreator ? "active" : ""}`}
                  onClick={() => setShowPollCreator(!showPollCreator)}
                  title="जनमत संग्रह (Poll) जोड़ें"
                  aria-label="जनमत संग्रह जोड़ें"
                >
                  <ChartIcon size={20} />
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isRecording
                      ? "ध्वनि रिकॉर्ड हो रही है..."
                      : audioDataUrl
                      ? "संदेश के साथ टिप्पणी लिखें (वैकल्पिक)..."
                      : "संदेश लिखें... (Enter दबाकर भेजें)"
                  }
                  disabled={isRecording}
                  className="dm-input-field"
                  maxLength={2000}
                />

                {/* Send button or Mic button */}
                {inputText.trim() || audioDataUrl || (showPollCreator && pollQuestion.trim() && pollOptions.filter((o) => o.trim()).length >= 2) ? (
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    className="dm-send-btn"
                    title="संदेश प्रेषित करें"
                  >
                    <SendIcon size={16} />
                  </Button>
                ) : isRecording ? (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="dm-mic-btn is-recording-active"
                    title="रिकॉर्डिंग समाप्त करें"
                  >
                    <StopCircleIcon size={20} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="dm-mic-btn"
                    title="ध्वनि संदेश रिकॉर्ड करें"
                    aria-label="ध्वनि संदेश रिकॉर्ड करें"
                  >
                    <MicIcon size={20} />
                  </button>
                )}
              </form>
            </footer>
          </div>
        ) : (
          <div className="dm-no-active-selection">
            <div className="dm-empty-x-card">
              <div className="dm-empty-icon-circle">
                <MailIcon size={44} />
              </div>
              <h3 className="dm-empty-x-title">संदेश का चयन करें</h3>
              <p className="dm-empty-x-desc">
                अपनी मौजूदा बातचीतों में से चुनें, अथवा नया संवाद प्रारंभ करने के लिए किसी साधक के परिचय पृष्ठ पर जाएँ।
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
