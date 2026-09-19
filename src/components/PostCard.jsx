import React from "react";
import { Link } from "react-router-dom";
import { Avatar } from "./ui/Avatar";
import { timeAgo } from "../lib/timeAgo";
import { vocab } from "../lib/vocab";

export function PostCard({ post }) {
  const isAnonymous = post.isAnonymous;
  const authorProfileLink = isAnonymous || !post.authorId ? null : `/parichay/${post.authorId}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "संवाद — विचार",
          text: post.text,
          url: window.location.href
        });
      } catch {}
    } else {
      navigator.clipboard?.writeText(window.location.href);
      alert("कड़ी प्रतिलिपि कर ली गई है (Link copied)");
    }
  };

  return (
    <article className="post-card-container">
      {/* Header */}
      <header className="post-card-header">
        <div className="post-author-block">
          {authorProfileLink ? (
            <Link to={authorProfileLink}>
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
                <Link to={authorProfileLink} className="author-name-link">
                  {post.authorName || "सुधी साधक"}
                </Link>
              ) : (
                <span className="author-name-text">
                  {post.authorName || "साधक (गुप्त)"}
                </span>
              )}

              {isAnonymous ? (
                <span className="anon-badge">गुप्त विचार</span>
              ) : null}
            </div>

            <time className="post-time-label">
              {timeAgo(post.createdAt)}
            </time>
          </div>
        </div>

        {post.bhav && (
          <span className="post-bhav-badge">
            {post.bhav}
          </span>
        )}
      </header>

      {/* Body */}
      <div className="post-card-body">
        <p className="post-content-text">{post.text}</p>
      </div>

      {/* Actions Row using Sanskrit Vocabulary */}
      <footer className="post-card-actions">
        <button type="button" className="action-pill-btn" title="अनुमोदन (Like)">
          <span className="action-glyph">🌸</span>
          <span className="action-count">{post.likeCount || 0}</span>
          <span className="action-text">{vocab.like.hi}</span>
        </button>

        <button type="button" className="action-pill-btn" title="उत्तर (Reply)">
          <span className="action-glyph">💬</span>
          <span className="action-count">{post.replyCount || 0}</span>
          <span className="action-text">{vocab.reply.hi}</span>
        </button>

        <button type="button" className="action-pill-btn" title="प्रसार (Repost)">
          <span className="action-glyph">🔄</span>
          <span className="action-count">{post.repostCount || 0}</span>
          <span className="action-text">{vocab.repost.hi}</span>
        </button>

        <button type="button" className="action-pill-btn" title="स्मरण (Bookmark)">
          <span className="action-glyph">🔖</span>
          <span className="action-text">{vocab.bookmark.hi}</span>
        </button>

        <button type="button" className="action-pill-btn" onClick={handleShare} title="संक्रमण (Share)">
          <span className="action-glyph">↗</span>
          <span className="action-text">{vocab.share.hi}</span>
        </button>
      </footer>

      <div className="lotus-separator" aria-hidden="true">
        <span>🪷</span>
      </div>
    </article>
  );
}
