import React, { useState, useEffect } from "react";
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
  deleteVichar
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
  CloseIcon
} from "./ui/Icons";

export function PostCard({ post, debug = false, onPostDeleted }) {
  const { currentUser, userProfile, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const [reposted, setReposted] = useState(false);
  const [repostCount, setRepostCount] = useState(post.repostCount || 0);
  const [bookmarked, setBookmarked] = useState(false);
  const [replyCount] = useState(post.replyCount || 0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [activeLightboxImg, setActiveLightboxImg] = useState(null);

  useEffect(() => {
    if (!currentUser || !post.id) return;
    let isMounted = true;

    isPostLiked(post.id, currentUser.uid).then((val) => isMounted && setLiked(val));
    isPostReposted(post.id, currentUser.uid).then((val) => isMounted && setReposted(val));
    isPostBookmarked(post.id, currentUser.uid).then((val) => isMounted && setBookmarked(val));

    return () => { isMounted = false; };
  }, [post.id, currentUser]);

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
    setBookmarked(!prevBookmarked);

    try {
      await toggleSmaran(post.id, currentUser.uid);
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
      setToastMsg("लिंक कॉपी किया गया");
      setTimeout(() => setToastMsg(""), 2000);
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
      setToastMsg("विचार कॉपी किया गया");
      setTimeout(() => setToastMsg(""), 2000);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    triggerHaptic(15);
    setIsMenuOpen(false);
    if (window.confirm("क्या आप इस विचार को हटाना चाहते हैं?")) {
      try {
        await deleteVichar(post.id);
        setToastMsg("विचार हटा दिया गया");
        if (onPostDeleted) onPostDeleted(post.id);
      } catch (err) {
        console.error("Delete post error:", err);
        alert("विचार हटाने में त्रुटि हुई।");
      }
    }
  };

  const handleCardClick = () => {
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
    <article className="post-card-container" onClick={handleCardClick} role="button" tabIndex={0}>
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
          {post.text?.split(/(#[a-zA-Z0-9_\u0900-\u097F]+|@[a-zA-Z0-9_]{3,20})/gu).map((part, i) => {
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
                    navigate(`/?q=${encodeURIComponent(handle)}`);
                  }}
                  title={`@${handle} का परिचय खोजें`}
                >
                  {part}
                </span>
              );
            }
            return part;
          })}
        </p>

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

        {/* Link Preview Card (X-style for shared web links) */}
        {(() => {
          const urls = extractUrls(post.text);
          if (!urls || urls.length === 0) return null;
          const card = getLinkCardData(urls[0]);
          return (
            <div
              className="post-link-card"
              onClick={(e) => {
                e.stopPropagation();
                window.open(card.url, "_blank", "noopener,noreferrer");
              }}
              role="link"
              tabIndex={0}
              title={`खोलें: ${card.url}`}
            >
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
                  <span className="link-card-domain">{card.domain}</span>
                  <ExternalLinkIcon size={12} className="link-card-external-icon" />
                </div>
                <span className="link-card-url-text">{card.displayUrl}</span>
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
          className={`action-pill-btn ${liked ? "action-liked" : ""}`}
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
          className={`action-pill-btn ${reposted ? "action-reposted" : ""}`}
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
          className={`action-pill-btn ${bookmarked ? "action-bookmarked" : ""}`}
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
