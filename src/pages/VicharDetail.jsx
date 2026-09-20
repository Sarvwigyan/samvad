import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getVicharById,
  getPostReplies,
  createUttar,
  isPostLiked,
  toggleAnumodan,
  isPostReposted,
  togglePrasar,
  isPostBookmarked,
  toggleSmaran
} from "../lib/firestore";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { timeAgo } from "../lib/timeAgo";
import { playTempleChime } from "../lib/chime";
import { extractUrls, getLinkCardData } from "../lib/linkPreview";
import { searchUsersByMention } from "../lib/mentions";
import {
  HeartIcon,
  RepostIcon,
  BookmarkIcon,
  ShareIcon,
  ExternalLinkIcon,
  CloseIcon,
  SmileIcon
} from "../components/ui/Icons";
import { EmojiPicker } from "../components/ui/EmojiPicker";

export default function VicharDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, userProfile, loginWithGoogle } = useAuth();

  const [post, setPost] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Interaction states for main post
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [reposted, setReposted] = useState(false);
  const [repostCount, setRepostCount] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [activeLightboxImg, setActiveLightboxImg] = useState(null);

  // Reply Composer state
  const [replyText, setReplyText] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replyError, setReplyError] = useState("");
  const [copiedToast, setCopiedToast] = useState(false);
  const [replyMentionQuery, setReplyMentionQuery] = useState(null);
  const [replyMentionSuggestions, setReplyMentionSuggestions] = useState([]);
  const [isReplyEmojiOpen, setIsReplyEmojiOpen] = useState(false);
  const replyTextareaRef = useRef(null);
  const mentionSearchIdRef = useRef(0);

  const handleReplyChange = (e) => {
    const val = e.target.value;
    setReplyText(val);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);
    const match = textBeforeCursor.match(/@([a-zA-Z0-9_]*)$/);

    if (match) {
      const q = match[1];
      setReplyMentionQuery(q);
      const searchId = ++mentionSearchIdRef.current;
      searchUsersByMention(q, 5).then((results) => {
        if (mentionSearchIdRef.current === searchId) {
          setReplyMentionSuggestions(results || []);
        }
      }).catch(() => {
        if (mentionSearchIdRef.current === searchId) {
          setReplyMentionSuggestions([]);
        }
      });
    } else {
      setReplyMentionQuery(null);
      setReplyMentionSuggestions([]);
    }
  };

  const handleSelectReplyMention = (user) => {
    if (!replyTextareaRef.current) return;
    const cursorPos = replyTextareaRef.current.selectionStart;
    const textBeforeCursor = replyText.slice(0, cursorPos);
    const textAfterCursor = replyText.slice(cursorPos);

    const replacedBefore = textBeforeCursor.replace(/@([a-zA-Z0-9_]*)$/, `@${user.username} `);
    const newText = replacedBefore + textAfterCursor;
    setReplyText(newText);
    setReplyMentionQuery(null);
    setReplyMentionSuggestions([]);
    setTimeout(() => {
      if (replyTextareaRef.current) {
        replyTextareaRef.current.focus();
        const newPos = replacedBefore.length;
        replyTextareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 10);
  };

  const handleReplyEmojiSelect = (emoji) => {
    if (!replyTextareaRef.current) {
      setReplyText((prev) => prev + emoji);
      return;
    }
    const start = replyTextareaRef.current.selectionStart ?? replyText.length;
    const end = replyTextareaRef.current.selectionEnd ?? replyText.length;
    const newText = replyText.slice(0, start) + emoji + replyText.slice(end);
    setReplyText(newText);
    setTimeout(() => {
      if (replyTextareaRef.current) {
        replyTextareaRef.current.focus();
        const newPos = start + emoji.length;
        replyTextareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 10);
  };

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    setLoading(true);

    Promise.all([
      getVicharById(id),
      getPostReplies(id)
    ]).then(([postData, replyList]) => {
      if (isMounted && postData) {
        setPost(postData);
        setLikeCount(postData.likeCount || 0);
        setRepostCount(postData.repostCount || 0);
        setReplies(replyList || []);
        setLoading(false);

        if (currentUser) {
          isPostLiked(id, currentUser.uid).then((val) => isMounted && setLiked(val)).catch(() => {});
          isPostReposted(id, currentUser.uid).then((val) => isMounted && setReposted(val)).catch(() => {});
          isPostBookmarked(id, currentUser.uid).then((val) => isMounted && setBookmarked(val)).catch(() => {});
        }
      } else if (isMounted) {
        setLoading(false);
      }
    }).catch((err) => {
      console.error("Error loading Vichar thread:", err);
      if (isMounted) setLoading(false);
    });

    return () => { isMounted = false; };
  }, [id, currentUser]);

  const handleAnumodan = async () => {
    if (!currentUser) {
      loginWithGoogle();
      return;
    }
    const prevLiked = liked;
    const prevCount = likeCount;
    setLiked(!prevLiked);
    setLikeCount(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1);

    if (!prevLiked) playTempleChime();

    try {
      await toggleAnumodan(post.id, currentUser.uid);
    } catch (e) {
      setLiked(prevLiked);
      setLikeCount(prevCount);
    }
  };

  const handlePrasar = async () => {
    if (!currentUser) {
      loginWithGoogle();
      return;
    }
    const prevReposted = reposted;
    const prevCount = repostCount;
    setReposted(!prevReposted);
    setRepostCount(prevReposted ? Math.max(0, prevCount - 1) : prevCount + 1);

    try {
      await togglePrasar(post.id, currentUser.uid);
    } catch (e) {
      setReposted(prevReposted);
      setRepostCount(prevCount);
    }
  };

  const handleSmaran = async () => {
    if (!currentUser) {
      loginWithGoogle();
      return;
    }
    const prevBookmarked = bookmarked;
    setBookmarked(!prevBookmarked);

    try {
      await toggleSmaran(post.id, currentUser.uid);
    } catch (e) {
      setBookmarked(prevBookmarked);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "संवाद — विचार संवाद",
          text: post.text,
          url
        });
      } catch {}
    } else {
      try {
        await navigator.clipboard?.writeText(url);
      } catch {}
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2000);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      setReplyError("उत्तर प्रेषित करने हेतु गूगल से प्रवेश आवश्यक है");
      return;
    }
    const clean = replyText.trim();
    if (!clean) return;
    if (clean.length > 500) {
      setReplyError("उत्तर अधिकतम 500 अक्षरों तक ही सीमित है");
      return;
    }

    setIsSendingReply(true);
    setReplyError("");

    try {
      const newReply = await createUttar(post.id, {
        authorId: currentUser.uid,
        authorName: userProfile?.displayName || currentUser.displayName || "सुधी साधक",
        authorPhoto: userProfile?.avatarUrl || currentUser.photoURL || null,
        text: clean,
        isAnonymous
      });

      playTempleChime();
      setReplyText("");
      setReplies((prev) => [...prev, newReply]);
      setPost((prev) => ({ ...prev, replyCount: (prev.replyCount || 0) + 1 }));
    } catch (err) {
      console.error("Reply creation error:", err);
      setReplyError("उत्तर प्रेषित नहीं हो सका। कृपया पुनः प्रयास करें।");
    } finally {
      setIsSendingReply(false);
    }
  };

  if (loading) {
    return (
      <div className="thread-loading-box">
        <div className="lotus-spinner">☸</div>
        <p>विचार प्रवाह लोड हो रहा है...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="thread-not-found">
        <span className="not-found-glyph">❓</span>
        <h3>विचार उपलब्ध नहीं है</h3>
        <p>यह विचार विद्यमान नहीं है अथवा हटाया जा चुका है।</p>
        <Button variant="primary" size="sm" onClick={() => navigate("/")}>
          प्रवाह पर लौटें (Return Home)
        </Button>
      </div>
    );
  }

  const authorLink = post.isAnonymous || !post.authorId ? null : `/parichay/${post.authorId}`;

  // Dynamically resolve author name and photo for current user
  const isAuthorCurrentUser = currentUser && post.authorId === currentUser.uid;
  const displayAuthorName = (!post.isAnonymous && isAuthorCurrentUser && userProfile?.displayName)
    ? userProfile.displayName
    : (post.authorName || "सुधी साधक");

  const displayAuthorPhoto = (!post.isAnonymous && isAuthorCurrentUser && userProfile?.avatarUrl !== undefined)
    ? userProfile.avatarUrl
    : post.authorPhoto;

  return (
    <div className="vichar-detail-page">
      {/* Header bar */}
      <div className="detail-header-nav">
        <button type="button" className="back-nav-btn" onClick={() => navigate(-1)}>
          ← वापस
        </button>
        <h2 className="detail-title">विचार विमर्श (Thread)</h2>
      </div>

      {/* Main Vichar Document */}
      <article className="main-vichar-card">
        <header className="main-vichar-author">
          <div className="author-meta-block">
            {authorLink ? (
              <Link to={authorLink}>
                <Avatar
                  src={displayAuthorPhoto}
                  alt={displayAuthorName}
                  size="lg"
                  fallbackText={displayAuthorName}
                />
              </Link>
            ) : (
              <Avatar
                src={displayAuthorPhoto}
                alt={displayAuthorName}
                size="lg"
                fallbackText="साधक"
              />
            )}
            <div className="author-text-meta">
              {authorLink ? (
                <Link to={authorLink} className="author-display-link">
                  {displayAuthorName}
                </Link>
              ) : (
                <span className="author-display-text">
                  {displayAuthorName}
                </span>
              )}
              {((currentUser && post.authorId === currentUser.uid && userProfile?.verified) || post.verified) && (
                <span className="author-verified-badge" title="प्रमाणित साधक (Verified)">☸</span>
              )}
              <span className="author-handle">
                {post.isAnonymous ? "गुप्त साधक" : timeAgo(post.createdAt)}
              </span>
            </div>
          </div>

          {post.bhav && (
            <span className="bhav-badge-large">{post.bhav}</span>
          )}
        </header>

        <div className="main-vichar-text">
          {(post.text || "").split(/(#[a-zA-Z0-9_\u0900-\u097F]+|@[a-zA-Z0-9_]{3,20})/gu).map((part, i) => {
            if (part.startsWith("#")) {
              return (
                <span
                  key={i}
                  className="post-hashtag-link"
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/?q=${encodeURIComponent(part)}`);
                  }}
                  title={`'${part}' विषय के विचार खोजें`}
                >
                  {part}
                </span>
              );
            }
            if (part.startsWith("@")) {
              const handle = part.slice(1);
              return (
                <span
                  key={i}
                  className="post-mention-link"
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/parichay/${encodeURIComponent(handle)}`);
                  }}
                  title={`@${handle} का परिचय पत्रक देखें`}
                >
                  {part}
                </span>
              );
            }
            return part;
          })}
        </div>

        {post.poll && (
          <div className="post-poll-container" style={{ margin: '16px 0', padding: '16px', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '15px' }}>{post.poll.question || "मतदान"}</h4>
            {Array.from({ length: post.poll.length || 0 }).map((_, idx) => {
              const opt = post.poll[`opt${idx}`];
              if (!opt) return null;
              const pct = post.poll.totalVotes > 0 ? Math.round((opt.votes / post.poll.totalVotes) * 100) : 0;
              return (
                <div key={idx} style={{ marginBottom: '8px', position: 'relative', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${pct}%`, background: 'var(--accent-color)', opacity: 0.2 }} />
                  <div style={{ position: 'relative', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span>{opt.text}</span>
                    <span>{pct}%</span>
                  </div>
                </div>
              );
            })}
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>
              {post.poll.totalVotes || 0} मत (Votes)
            </div>
          </div>
        )}

        {post.audioData && (
          <div style={{ marginTop: '12px' }}>
            <audio src={post.audioData} controls style={{ width: '100%', height: '36px' }} />
          </div>
        )}

        {/* Attached Images Grid (X-style 1-4 images) */}
        {post.images && post.images.length > 0 && (
          <div className={`post-media-grid grid-count-${Math.min(post.images.length, 4)}`}>
            {post.images.slice(0, 4).map((imgUrl, idx) => (
              <div
                key={idx}
                className="post-media-cell"
                onClick={() => setActiveLightboxImg(imgUrl)}
                role="button"
                tabIndex={0}
                title="चित्र बड़ा करके देखें"
              >
                <img
                  src={imgUrl}
                  alt={`संलग्न चित्र ${idx + 1}`}
                  className="post-media-img"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            ))}
          </div>
        )}

        {/* X-Style Rich Link Preview Card */}
        {(() => {
          const card = post.linkCard || (() => {
            const urls = extractUrls(post.text);
            return urls && urls.length > 0 ? getLinkCardData(urls[0]) : null;
          })();
          if (!card || !card.url) return null;

          return (
            <div
              className={`post-link-card ${card.image ? "has-rich-image" : ""}`}
              onClick={() => window.open(card.url, "_blank", "noopener,noreferrer")}
              role="link"
              tabIndex={0}
              title={`खोलें: ${card.url}`}
            >
              {card.image && (
                <div className="post-link-card-img-wrap">
                  <img src={card.image} alt="" className="post-link-card-img" loading="lazy" onError={(e) => { e.target.parentElement.style.display = 'none'; }} />
                </div>
              )}
              <div className="link-card-content">
                <div className="link-card-header-line">
                  {card.favicon ? (
                    <img
                      src={card.favicon}
                      alt=""
                      className="link-card-favicon"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : null}
                  <span className="link-card-domain">{card.domain || card.publisher}</span>
                  <ExternalLinkIcon size={12} className="link-card-external-icon" />
                </div>
                {card.title && <h4 className="post-link-card-title">{card.title}</h4>}
                {card.description && <p className="post-link-card-desc">{card.description}</p>}
                {!card.title && <span className="link-card-url-text">{card.displayUrl || card.url}</span>}
              </div>
            </div>
          );
        })()}

        <div className="main-vichar-timestamp">
          <span>{timeAgo(post.createdAt)}</span> • <span>सार्वजनिक प्रवाह</span>
        </div>

        {/* Counter Stats Bar */}
        <div className="detail-metrics-row">
          <div className="metric-item">
            <strong>{likeCount}</strong> <span>अनुमोदन</span>
          </div>
          <div className="metric-item">
            <strong>{replies.length}</strong> <span>उत्तर</span>
          </div>
          <div className="metric-item">
            <strong>{repostCount}</strong> <span>प्रसार</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="detail-actions-bar">
          <button
            type="button"
            className={`detail-action-btn ${liked ? "active-anumodan" : ""}`}
            onClick={handleAnumodan}
            title="अनुमोदन (Like)"
          >
            <span className="action-icon">
              <HeartIcon size={18} filled={liked} />
            </span>
            <span>अनुमोदन</span>
          </button>

          <button
            type="button"
            className={`detail-action-btn ${reposted ? "active-prasar" : ""}`}
            onClick={handlePrasar}
            title="प्रसार (Repost)"
          >
            <span className="action-icon">
              <RepostIcon size={18} />
            </span>
            <span>प्रसार</span>
          </button>

          <button
            type="button"
            className={`detail-action-btn ${bookmarked ? "active-smaran" : ""}`}
            onClick={handleSmaran}
            title="स्मरण (Bookmark)"
          >
            <span className="action-icon">
              <BookmarkIcon size={18} filled={bookmarked} />
            </span>
            <span>स्मरण</span>
          </button>

          <button
            type="button"
            className="detail-action-btn"
            onClick={handleShare}
            title="संक्रमण (Share)"
          >
            <span className="action-icon">
              <ShareIcon size={18} />
            </span>
            <span>{copiedToast ? "प्रतिलिपि!" : "साझा"}</span>
          </button>
        </div>
      </article>

      {/* Reply Composer */}
      <section className="reply-composer-container">
        {currentUser ? (
          <form className="reply-form" onSubmit={handleSendReply}>
            <div className="reply-input-row" style={{ position: "relative" }}>
              <Avatar
                src={userProfile?.avatarUrl || currentUser.photoURL}
                alt={userProfile?.displayName || currentUser.displayName}
                size="md"
                fallbackText={userProfile?.displayName || currentUser.displayName}
              />
              <div style={{ flex: 1, position: "relative" }}>
                <textarea
                  ref={replyTextareaRef}
                  value={replyText}
                  onChange={handleReplyChange}
                  placeholder="सादर उत्तर प्रेषित करें... @उल्लेख का प्रयोग करें (Reply)"
                  className="reply-textarea"
                  rows={2}
                  maxLength={1000}
                  disabled={isSendingReply}
                />

                {/* Reply Mention Suggestions */}
                {replyMentionQuery !== null && replyMentionSuggestions.length > 0 && (
                  <div className="composer-mention-suggestions" style={{ bottom: "100%", top: "auto", marginBottom: "6px" }}>
                    <div className="mention-suggestion-header">
                      <span>साधक उल्लेख (@Mention)</span>
                    </div>
                    <div className="mention-suggestion-list">
                      {replyMentionSuggestions.map((u) => (
                        <button
                          key={u.uid}
                          type="button"
                          className="mention-suggestion-item"
                          onClick={() => handleSelectReplyMention(u)}
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

            {replyError && <p className="reply-error-text">⚠️ {replyError}</p>}

            <div className="reply-footer-row">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  className={`anon-toggle-sm ${isAnonymous ? "active" : ""}`}
                  onClick={() => setIsAnonymous(!isAnonymous)}
                >
                  {isAnonymous ? "गुप्त उत्तर" : "आत्म-पहचान"}
                </button>

                {/* Reply Emoji Trigger */}
                <div style={{ position: "relative" }}>
                  <button
                    type="button"
                    className={`composer-action-icon-btn ${isReplyEmojiOpen ? "active" : ""}`}
                    onClick={() => setIsReplyEmojiOpen(!isReplyEmojiOpen)}
                    title="इमोजी जोड़ें"
                    aria-label="इमोजी जोड़ें"
                  >
                    <SmileIcon size={18} />
                  </button>
                  {isReplyEmojiOpen && (
                    <EmojiPicker
                      onSelect={(emoji) => handleReplyEmojiSelect(emoji)}
                      onClose={() => setIsReplyEmojiOpen(false)}
                      align="bottom"
                    />
                  )}
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSendingReply || !replyText.trim()}
                loading={isSendingReply}
              >
                उत्तर दें (Reply)
              </Button>
            </div>
          </form>
        ) : (
          <div className="reply-guest-banner">
            <p>उत्तर प्रेषित करने हेतु कृपया गूगल से प्रवेश करें।</p>
            <Button variant="primary" size="sm" onClick={loginWithGoogle}>
              गूगल प्रवेश
            </Button>
          </div>
        )}
      </section>

      {/* Threaded Replies Stream */}
      <section className="replies-stream-section">
        <h3 className="replies-stream-heading">
          उत्तर-परम्परा ({replies.length})
        </h3>

        {replies.length === 0 ? (
          <div className="empty-replies-box">
            <p>अभी तक कोई उत्तर नहीं है। प्रथम विचार-प्रतिक्रिया दें।</p>
          </div>
        ) : (
          <div className="replies-list">
            {replies.map((reply) => {
              const rLink = reply.isAnonymous || !reply.authorId ? null : `/parichay/${reply.authorId}`;
              const isReplyCurrentUser = currentUser && reply.authorId === currentUser.uid;
              const displayReplyName = (!reply.isAnonymous && isReplyCurrentUser && userProfile?.displayName)
                ? userProfile.displayName
                : (reply.authorName || "सुधी साधक");

              const displayReplyPhoto = (!reply.isAnonymous && isReplyCurrentUser && userProfile?.avatarUrl !== undefined)
                ? userProfile.avatarUrl
                : reply.authorPhoto;

              return (
                <div key={reply.id} className="reply-item-card">
                  <div className="reply-author-row">
                    {rLink ? (
                      <Link to={rLink}>
                        <Avatar
                          src={displayReplyPhoto}
                          alt={displayReplyName}
                          size="sm"
                          fallbackText={displayReplyName}
                        />
                      </Link>
                    ) : (
                      <Avatar
                        src={displayReplyPhoto}
                        alt={displayReplyName}
                        size="sm"
                        fallbackText="साधक"
                      />
                    )}
                    <div className="reply-meta">
                      {rLink ? (
                        <Link to={rLink} className="reply-author-name">
                          {displayReplyName}
                        </Link>
                      ) : (
                        <span className="reply-author-name">
                          {displayReplyName}
                        </span>
                      )}
                      <span className="reply-time">{timeAgo(reply.createdAt)}</span>
                    </div>
                  </div>
                  <p className="reply-text-content">{reply.text}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Lightbox Modal */}
      {activeLightboxImg && (
        <div
          className="media-lightbox-backdrop"
          onClick={() => setActiveLightboxImg(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="media-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="media-lightbox-close-btn"
              onClick={() => setActiveLightboxImg(null)}
              aria-label="बंद करें"
            >
              <CloseIcon size={20} />
            </button>
            <img src={activeLightboxImg} alt="विस्तृत चित्र" className="lightbox-full-img" />
          </div>
        </div>
      )}
    </div>
  );
}
