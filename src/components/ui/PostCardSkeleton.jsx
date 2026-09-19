import React from "react";

/**
 * X & YouTube style Shimmer Skeleton Loader for PostCard
 * Eliminates layout shifts and provides instant perceived performance.
 */
export function PostCardSkeleton({ count = 3 }) {
  return (
    <div className="skeleton-feed-list" aria-busy="true" aria-label="विचार लोड हो रहे हैं...">
      {Array.from({ length: count }).map((_, i) => (
        <article key={i} className="post-skeleton-card">
          <header className="skeleton-header">
            <div className="skeleton-avatar shimmer" />
            <div className="skeleton-header-meta">
              <div className="skeleton-line skeleton-author shimmer" />
              <div className="skeleton-line skeleton-handle shimmer" />
            </div>
          </header>
          <div className="skeleton-body">
            <div className="skeleton-line skeleton-text shimmer" style={{ width: "96%" }} />
            <div className="skeleton-line skeleton-text shimmer" style={{ width: "84%" }} />
            <div className="skeleton-line skeleton-text shimmer" style={{ width: "55%" }} />
          </div>
          <footer className="skeleton-actions">
            <div className="skeleton-pill shimmer" />
            <div className="skeleton-pill shimmer" />
            <div className="skeleton-pill shimmer" />
            <div className="skeleton-pill shimmer" />
            <div className="skeleton-pill shimmer" />
          </footer>
        </article>
      ))}
    </div>
  );
}
