import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Avatar } from "./ui/Avatar";
import { timeAgo } from "../lib/timeAgo";
import { vocab } from "../lib/vocab";
import { useAuth } from "../context/AuthContext";
import {
  isPostLiked,
  toggleAnumodan,
  isPostReposted,
  togglePrasar,
  isPostBookmarked,
  toggleSmaran,
  deleteVichar,
  incrementViews,
  getUserPollVote,
  castPollVote
} from "../lib/firestore";
import { playTempleChime } from "../lib/chime";
import { triggerHaptic } from "../lib/haptics";
import { extractUrls, getLinkCardData } from "../lib/linkPreview";
import {
  HeartIcon,
  ReplyIcon,
  RepostIcon,
  BookmarkIcon,
  ShareIcon,
  MoreHorizontalIcon,
  TrashIcon,
  CopyIcon,
  InfinityIcon,
  ExternalLinkIcon,
  CloseIcon,
  EyeIcon
} from "./ui/Icons";

function PostCardComponent({ post, debug = false, onPostDeleted }) {
  if (!post?.id) return null;

  const getMillis = (ts) => (ts?.toMillis ? ts.toMillis() : ts instanceof Date ? ts.getTime() : typeof ts === 'number' ? ts : Date.now());

  const { currentUser, userProfile, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const cardRef = useRef(null);
  const pointerDownPosRef = useRef({ x: 0, y: 0 });
  const isDragOrSelectRef = useRef(false);

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const [reposted, setReposted] = useState(false);
  const [repostCount, setRepostCount] = useState(post.repostCount || 0);
  const [bookmarked, setBookmarked] = useState(false);
  const [replyCount] = useState(post.replyCount || 0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const toastTimerRef = useRef(null);
  const [activeLightboxImg, setActiveLightboxImg] = useState(null);
  
  // Analytics and Polls
  const [viewed, setViewed] = useState(false);
  const [localPoll, setLocalPoll] = useState(post.poll);
  const [pollVotedIndex, setPollVotedIndex] = useState(null);

  // Sync state when props update
  useEffect(() => {
    setLikeCount(post.likeCount || 0);
    setRepostCount(post.repostCount || 0);
    setLocalPoll(post.poll);
  }, [post.likeCount, post.repostCount, post.poll]);

  // Clean up toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMsg(""), 2000);
  };

  useEffect(() => {
    if (!currentUser || !post.id) return;
    let isMounted = true;

    isPostLiked(post.id, currentUser.uid).then((val) => isMounted && setLiked(val)).catch(() => {});
    isPostReposted(post.id, currentUser.uid).then((val) => isMounted && setReposted(val)).catch(() => {});
    isPostBookmarked(post.id, currentUser.uid).then((val) => isMounted && setBookmarked(val)).catch(() => {});
    
    if (post.poll) {
      getUserPollVote(post.id, currentUser.uid).then((idx) => {
        if (isMounted && idx !== null && idx !== undefined) {
          setPollVotedIndex(idx);
        }
      }).catch(() => {});
    }

    return () => { isMounted = false; };
  }, [post.id, currentUser, post.poll]);

  useEffect(() => {
    if (!cardRef.current || viewed || !post.id) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setViewed(true);
        incrementViews(post.id);
        observer.disconnect();
      }
    }, { threshold: 0.1 });
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [post.id, viewed]);

  const handleVote = async (e, idx) => {
    e.stopPropagation();
    if (!currentUser) {
      loginWithGoogle();
      return;
    }
    if (pollVotedIndex !== null) return;
    
    // Optimistic UI
    setPollVotedIndex(idx);
    const prevPoll = localPoll;
    const newPoll = JSON.parse(JSON.stringify(localPoll));
    if (!newPoll[`opt${idx}`]) return;
    newPoll[`opt${idx}`].votes += 1;
    newPoll.totalVotes += 1;
    setLocalPoll(newPoll);
    triggerHaptic(10);
    
    try {
      await castPollVote(post.id, currentUser.uid, idx);
    } catch (err) {
      setPollVotedIndex(null);
      setLocalPoll(prevPoll);
      alert(err.message);
    }
  };

  const handleAnumodan = async (e) => {
    e.stopPropagation();
    triggerHaptic(10);
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
    } catch (err) {
      setLiked(prevLiked);
      setLikeCount(prevCount);
    }
  };

  const handlePrasar = async (e) => {
    e.stopPropagation();
    triggerHaptic(10);
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
    } catch (err) {
      setReposted(prevReposted);
      setRepostCount(prevCount);
    }
  };

  const handleSmaran = async (e) => {
    e.stopPropagation();
    triggerHaptic(10);
    if (!currentUser) {
      loginWithGoogle();
      return;
    }

    const prevBookmarked = bookmarked;
    let folderName = "सामान्य";
    
    // Only ask for folder if we are bookmarking (not unbookmarking)
    if (!prevBookmarked) {
      const input = window.prompt("संचित करने के लिए फ़ोल्डर का नाम (उदा: अध्यात्म, राजनीति, समाचार):", "सामान्य");
      if (input === null) return; // User cancelled
      folderName = input.trim() || "सामान्य";
    }

    setBookmarked(!prevBookmarked);

    try {
      await toggleSmaran(post.id, currentUser.uid, folderName);
    } catch (err) {
      setBookmarked(prevBookmarked);
    }
  };

  const handleShare = async (e) => {
    e.stopPropagation();
    triggerHaptic(10);
    const url = `${window.location.origin}${window.location.pathname}#/vichar/${post.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "संवाद — विचार",
          text: post.text,
          url
        });
      } catch {}
    } else {
      try {
        await navigator.clipboard?.writeText(url);
      } catch {}
      showToast("लिंक कॉपी किया गया");
    }
  };

  const handleCopy = (e) => {
    e.stopPropagation();
    triggerHaptic(10);
    setIsMenuOpen(false);
    if (navigator.clipboard) {
      try {
        navigator.clipboard.writeText(post.text);
      } catch {}
      showToast("विचार कॉपी किया गया");
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    triggerHaptic(15);
    setIsMenuOpen(false);
    if (window.confirm("क्या आप इस विचार को हटाना चाहते हैं?")) {
      try {
        await deleteVichar(post.id);
        showToast("विचार हटा दिया गया");
        if (onPostDeleted) onPostDeleted(post.id);
      } catch (err) {
        console.error("Delete post error:", err);
        alert("विचार हटाने में त्रुटि हुई।");
      }
    }
  };

  const handleMouseDown = (e) => {
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
    isDragOrSelectRef.current = false;
  };

  const handleMouseUp = (e) => {
    const dx = Math.abs(e.clientX - pointerDownPosRef.current.x);
    const dy = Math.abs(e.clientY - pointerDownPosRef.current.y);
    if (dx > 5 || dy > 5) {
      isDragOrSelectRef.current = true;
    }
  };

  const handleCardClick = () => {
    const sel = typeof window !== "undefined" ? window.getSelection?.() : null;
    if (sel && sel.toString().trim().length > 0) return;
    if (isDragOrSelectRef.current) return;
    if (post.id) {
      navigate(`/vichar/${post.id}`);
    }
  };

  const isAnonymous = post.isAnonymous;
  const authorProfileLink = isAnonymous || !post.authorId ? null : `/parichay/${post.authorId}`;

  // Dynamic author resolution: If authored by current user, immediately reflect new name/avatar!
  const isAuthorCurrentUser = currentUser && post.authorId === currentUser.uid;
  const displayAuthorName = (!isAnonymous && isAuthorCurrentUser && userProfile?.displayName)
    ? userProfile.displayName
    : (post.authorName || "सुधी साधक");

  const displayAuthorPhoto = (!isAnonymous && isAuthorCurrentUser && userProfile?.avatarUrl !== undefined)
    ? userProfile.avatarUrl
    : post.authorPhoto;

  return (
    <article
      className="post-card-container"
      onClick={handleCardClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onCopy={(e) => e.stopPropagation()}
      ref={cardRef}
    >
      {/* Toast Notification */}
      {toastMsg && <div className="post-action-toast">{toastMsg}</div>}

      {/* Header */}
      <header className="post-card-header">
        <div className="post-author-block">
          {authorProfileLink ? (
            <Link to={authorProfileLink} onClick={(e) => e.stopPropagation()}>
              <Avatar
                src={displayAuthorPhoto}
                alt={displayAuthorName}
                size="md"
                fallbackText={displayAuthorName}
              />
            </Link>
          ) : (
            <Avatar
              src={displayAuthorPhoto}
              alt={displayAuthorName}
              size="md"
              fallbackText="साधक"
            />
          )}

          <div className="post-author-meta">
            <div className="author-name-line">
              {authorProfileLink ? (
                <Link
                  to={authorProfileLink}
                  className="author-name-link"
                  onClick={(e) => e.stopPropagation()}
                >
                  {displayAuthorName}
                </Link>
              ) : (
                <span className="author-name-text">
                  {displayAuthorName}
                </span>
              )}
              {((isAuthorCurrentUser && userProfile?.verified) || post.verified) && (
                <span className="author-verified-badge" title="प्रमाणित साधक (Verified)">☸</span>
              )}

              {isAnonymous && <span className="anon-badge">गुप्त विचार</span>}
            </div>

            <time className="post-time-label">
              {timeAgo(post.createdAt)}
            </time>
          </div>
        </div>

        <div className="post-header-badges">
          {post.preserve && (
            <span
              className="preserved-badge"
              title="अमर विचार (Preserved Forever — 10+ सहभागिता या संजोया गया)"
              aria-label="अमर विचार"
              style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              <InfinityIcon size={14} /> अमर
            </span>
          )}

          {debug && post.rankScore !== undefined && (
            <span
              className="debug-rank-badge"
              title={`Rank Score: ${(post.rankScore * 100).toFixed(2)}% | Sim: ${(post.semanticSimilarity ?? 0).toFixed(2)} | Eng: ${(post.engagementNorm ?? 0).toFixed(2)} | Rec: ${(post.recencyScore ?? 0).toFixed(2)}`}
            >
              ⚡ {(post.rankScore * 100).toFixed(0)}%
            </span>
          )}

          {post.bhav && (
            <span
              className="post-bhav-badge clickable"
              role="button"
              tabIndex={0}
              title={`'${post.bhav}' श्रेणी के विचार खोजें`}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/?q=${encodeURIComponent(post.bhav)}`);
              }}
            >
              {post.bhav}
            </span>
          )}

          {/* Three-Dot Options Menu */}
          <div className="post-header-menu-wrap">
            <button
              type="button"
              className="post-menu-trigger-btn"
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic(8);
                setIsMenuOpen(!isMenuOpen);
              }}
              aria-label="विचार विकल्प"
              title="विकल्प"
            >
              <MoreHorizontalIcon size={18} />
            </button>

            {isMenuOpen && (
              <div className="post-options-dropdown" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="post-dropdown-item" onClick={handleCopy}>
                  <CopyIcon size={15} />
                  <span>विचार कॉपी करें</span>
                </button>

                {currentUser && post.authorId === currentUser.uid && (
                  <button type="button" className="post-dropdown-item item-delete" onClick={handleDelete}>
                    <TrashIcon size={15} />
                    <span>विचार हटाएँ</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Body with Clickable Hashtags, Mentions & Links */}
      <div className="post-card-body">
        <p className="post-content-text">
          {(post.text || "").split(/(#[a-zA-Z0-9_\u0900-\u097F]+|@[a-zA-Z0-9_]{1,30})/gu).map((part, i) => {
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
        </p>

        {/* Poll UI */}
        {localPoll && (
          <div className="post-poll-container" onClick={e => e.stopPropagation()}>
            <p className="poll-question">{localPoll.question}</p>
            <div className="poll-options">
              {Array.from({ length: localPoll.length }).map((_, i) => {
                const opt = localPoll[`opt${i}`];
                if (!opt) return null;
                const percentage = localPoll.totalVotes > 0 ? Math.round((opt.votes / localPoll.totalVotes) * 100) : 0;
                const isSelected = pollVotedIndex === i;
                const showResults = pollVotedIndex !== null || getMillis(localPoll.expiresAt) < Date.now();
                return (
                  <button
                    key={i}
                    type="button"
                    className={`poll-option-row ${isSelected ? "selected" : ""}`}
                    onClick={(e) => handleVote(e, i)}
                    disabled={pollVotedIndex !== null || getMillis(localPoll.expiresAt) < Date.now()}
                    aria-label={`${opt.text} ${showResults ? `${percentage}%` : ""}`}
                  >
                    <div className="poll-progress-bg" style={{ width: showResults ? `${percentage}%` : '0%' }}></div>
                    <div className="poll-option-content">
                      <span className="poll-option-text">{opt.text} {isSelected && "✓"}</span>
                      {showResults && <span className="poll-option-percent">{percentage}%</span>}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="poll-footer">
              <span>{localPoll.totalVotes} मतदान</span>
              <span>•</span>
              <span>{getMillis(localPoll.expiresAt) < Date.now() ? "समाप्त" : "सक्रिय"}</span>
            </div>
          </div>
        )}

        {/* Attached Images Grid (X-style 1-4 images) */}
        {post.images && post.images.length > 0 && (
          <div className={`post-media-grid grid-count-${Math.min(post.images.length, 4)}`}>
            {post.images.slice(0, 4).map((imgUrl, idx) => (
              <div
                key={idx}
                className="post-media-cell"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveLightboxImg(imgUrl);
                }}
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

        {/* Audio Player */}
        {post.audioData && (
          <div className="post-audio-container" onClick={e => e.stopPropagation()} style={{ marginTop: "12px", width: "100%" }}>
            <audio src={post.audioData} controls style={{ width: "100%", height: "36px", outline: "none" }} />
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
              onClick={(e) => {
                e.stopPropagation();
                window.open(card.url, "_blank", "noopener,noreferrer");
              }}
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
      </div>

      {/* Actions Row using Symbolic SVG Vector Icons */}
      <footer className="post-card-actions">
        {/* Anumodan (Like) */}
        <button
          type="button"
          className={`action-pill-btn ${liked ? "is-liked action-liked" : ""}`}
          onClick={handleAnumodan}
          title="अनुमोदन (Like)"
          aria-label="अनुमोदन"
        >
          <span className="action-glyph">
            <HeartIcon size={17} filled={liked} />
          </span>
          <span className="action-count">{likeCount}</span>
          <span className="action-text">{vocab.like.hi}</span>
        </button>

        {/* Uttar (Reply) */}
        <button
          type="button"
          className="action-pill-btn"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/vichar/${post.id}`);
          }}
          title="उत्तर (Reply)"
          aria-label="उत्तर"
        >
          <span className="action-glyph">
            <ReplyIcon size={16} />
          </span>
          <span className="action-count">{replyCount}</span>
          <span className="action-text">{vocab.reply.hi}</span>
        </button>

        {/* Prasar (Repost) */}
        <button
          type="button"
          className={`action-pill-btn ${reposted ? "is-reposted action-reposted" : ""}`}
          onClick={handlePrasar}
          title="प्रसार (Repost)"
          aria-label="प्रसार"
        >
          <span className="action-glyph">
            <RepostIcon size={16} />
          </span>
          <span className="action-count">{repostCount}</span>
          <span className="action-text">{vocab.repost.hi}</span>
        </button>

        {/* Smaran (Bookmark) */}
        <button
          type="button"
          className={`action-pill-btn ${bookmarked ? "is-bookmarked action-bookmarked" : ""}`}
          onClick={handleSmaran}
          title="स्मरण (Bookmark)"
          aria-label="स्मरण"
        >
          <span className="action-glyph">
            <BookmarkIcon size={16} filled={bookmarked} />
          </span>
          <span className="action-text">{vocab.bookmark.hi}</span>
        </button>

        {/* Sankraman (Share) */}
        <button
          type="button"
          className="action-pill-btn"
          onClick={handleShare}
          title="संक्रमण (Share)"
          aria-label="साझा करें"
        >
          <span className="action-glyph">
            <ShareIcon size={16} />
          </span>
          <span className="action-text">{vocab.share.hi}</span>
        </button>

        {/* Analytics (Views) */}
        <div className="action-pill-btn view-count-btn" style={{ cursor: 'default' }} title="दृष्टि (Impressions)">
          <span className="action-glyph">
            <EyeIcon size={16} />
          </span>
          <span className="action-count">{post.viewCount || 0}</span>
        </div>
      </footer>

      <div className="lotus-separator" aria-hidden="true">
        <span>☸</span>
      </div>

      {/* Lightbox Modal */}
      {activeLightboxImg && (
        <div
          className="media-lightbox-backdrop"
          onClick={(e) => {
            e.stopPropagation();
            setActiveLightboxImg(null);
          }}
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
    </article>
  );
}

export const PostCard = React.memo(PostCardComponent);
