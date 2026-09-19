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
  toggleSmaran
} from "../lib/firestore";
import { playTempleChime } from "../lib/chime";

export function PostCard({ post, debug = false }) {
  const { currentUser, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const [reposted, setReposted] = useState(false);
  const [repostCount, setRepostCount] = useState(post.repostCount || 0);
  const [bookmarked, setBookmarked] = useState(false);
  const [replyCount] = useState(post.replyCount || 0);
  const [copiedToast, setCopiedToast] = useState(false);

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
      navigator.clipboard?.writeText(url);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2000);
    }
  };

  const handleCardClick = () => {
    if (post.id) {
      navigate(`/vichar/${post.id}`);
    }
  };

  const isAnonymous = post.isAnonymous;
  const authorProfileLink = isAnonymous || !post.authorId ? null : `/parichay/${post.authorId}`;

  return (
    <article className="post-card-container" onClick={handleCardClick} role="button" tabIndex={0}>
      {/* Header */}
      <header className="post-card-header">
        <div className="post-author-block">
          {authorProfileLink ? (
            <Link to={authorProfileLink} onClick={(e) => e.stopPropagation()}>
              <Avatar
                src={post.authorPhoto}
                alt={post.authorName}
                size="md"
                fallbackText={post.authorName}
              />
            </Link>
          ) : (
            <Avatar
              src={post.authorPhoto}
              alt={post.authorName}
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
                  {post.authorName || "सुधी साधक"}
                </Link>
              ) : (
                <span className="author-name-text">
                  {post.authorName || "साधक (गुप्त)"}
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
            >
              ♾️ अमर
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
            <span className="post-bhav-badge">
              {post.bhav}
            </span>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="post-card-body">
        <p className="post-content-text">{post.text}</p>
      </div>

      {/* Actions Row using Sanskrit Vocabulary */}
      <footer className="post-card-actions">
        {/* Anumodan (Like) */}
        <button
          type="button"
          className={`action-pill-btn ${liked ? "action-liked" : ""}`}
          onClick={handleAnumodan}
          title="अनुमोदन (Like)"
          aria-label="अनुमोदन"
        >
          <span className="action-glyph">{liked ? "🪷" : "🌸"}</span>
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
          <span className="action-glyph">💬</span>
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
          <span className="action-glyph">🔄</span>
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
          <span className="action-glyph">{bookmarked ? "🔖" : "🏷️"}</span>
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
          <span className="action-glyph">↗</span>
          <span className="action-text">{copiedToast ? "प्रतिलिपि!" : vocab.share.hi}</span>
        </button>
      </footer>

      <div className="lotus-separator" aria-hidden="true">
        <span>🪷</span>
      </div>
    </article>
  );
}
