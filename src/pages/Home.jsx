import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { PostComposer } from "../components/PostComposer";
import { PostCard } from "../components/PostCard";
import { PostCardSkeleton } from "../components/ui/PostCardSkeleton";
import { FeedTabs, FEED_TAB_KEY, TAB_PRAVAH, TAB_NAYA } from "../components/FeedTabs";
import { useRankedFeed } from "../hooks/useRankedFeed";
import { SearchIcon, StreamIcon } from "../components/ui/Icons";

const INITIAL_BATCH_SIZE = 10;
const BATCH_INCREMENT = 8;

export default function Home() {
  const { currentUser } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const filterQuery = searchParams.get("q") || "";
  const isDebug = searchParams.get("debug") === "1";

  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef(null);

  const [activeTab, setActiveTab] = useState(() => {
    try {
      const saved = localStorage.getItem(FEED_TAB_KEY);
      if (saved === TAB_PRAVAH || saved === TAB_NAYA) return saved;
      return currentUser ? TAB_PRAVAH : TAB_NAYA;
    } catch (e) {
      return TAB_NAYA;
    }
  });

  const { rankedPosts } = useRankedFeed(posts, currentUser, activeTab === TAB_PRAVAH);

  useEffect(() => {
    let unsubscribeFallback = null;

    // Listen to posts collection in real-time
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(50));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        // Strict deduplication by ID
        const unique = [];
        const seen = new Set();
        for (const item of items) {
          if (!seen.has(item.id)) {
            seen.add(item.id);
            unique.push(item);
          }
        }
        setPosts(unique);
        setLoading(false);
      },
      (err) => {
        console.warn("Primary posts orderBy query notice, falling back to unordered listener:", err.message);
        const fbQuery = query(collection(db, "posts"), limit(50));
        unsubscribeFallback = onSnapshot(
          fbQuery,
          (fbSnap) => {
            const items = fbSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
            items.sort((a, b) => {
              const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt || 0);
              const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt || 0);
              return timeB - timeA;
            });
            const unique = [];
            const seen = new Set();
            for (const item of items) {
              if (!seen.has(item.id)) {
                seen.add(item.id);
                unique.push(item);
              }
            }
            setPosts(unique);
            setLoading(false);
          },
          (fbErr) => {
            console.error("Feed snapshot error:", fbErr);
            setLoading(false);
          }
        );
      }
    );

    return () => {
      unsubscribe();
      if (unsubscribeFallback) unsubscribeFallback();
    };
  }, []);

  // Reset lazy load window on tab change or search filter
  useEffect(() => {
    setVisibleCount(INITIAL_BATCH_SIZE);
  }, [activeTab, filterQuery]);

  const handlePostCreated = (newPost) => {
    if (!newPost?.id) return;
    setPosts((prev) => {
      if (prev.some((p) => p.id === newPost.id)) return prev;
      return [newPost, ...prev];
    });
  };

  const handlePostDeleted = (deletedPostId) => {
    if (!deletedPostId) return;
    setPosts((prev) => prev.filter((p) => p.id !== deletedPostId));
  };

  const candidatePosts = activeTab === TAB_PRAVAH ? rankedPosts : posts;

  const displayedPosts = filterQuery
    ? candidatePosts.filter((p) => {
        const qLower = filterQuery.toLowerCase();
        return (
          p.text?.toLowerCase().includes(qLower) ||
          p.bhav?.toLowerCase().includes(qLower) ||
          p.authorName?.toLowerCase().includes(qLower)
        );
      })
    : candidatePosts;

  const visiblePosts = displayedPosts.slice(0, visibleCount);

  // Advanced IntersectionObserver for progressive infinite lazy loading (like YouTube & X)
  useEffect(() => {
    if (
      !sentinelRef.current ||
      typeof window === "undefined" ||
      !("IntersectionObserver" in window) ||
      visibleCount >= displayedPosts.length
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && visibleCount < displayedPosts.length) {
          setLoadingMore(true);
          setTimeout(() => {
            setVisibleCount((prev) => Math.min(prev + BATCH_INCREMENT, displayedPosts.length));
            setLoadingMore(false);
          }, 120);
        }
      },
      { rootMargin: "300px" } // Pre-loads next batch 300px before reaching the bottom
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [visibleCount, displayedPosts.length]);

  return (
    <div className="home-pravah-page">
      {/* Active Filter Banner if searching */}
      {filterQuery && (
        <div className="search-filter-banner">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <SearchIcon size={16} /> खोज परिणाम: <strong>"{filterQuery}"</strong> ({displayedPosts.length} विचार)
          </span>
          <button
            type="button"
            className="clear-filter-btn"
            onClick={() => setSearchParams({})}
          >
            फ़िल्टर हटाएँ ✕
          </button>
        </div>
      )}

      {/* Top Composer (Only show when not in filtered search mode) */}
      {!filterQuery && (
        <section className="home-composer-section">
          <PostComposer onPostCreated={handlePostCreated} />
        </section>
      )}

      {/* Feed Tabs: प्रवाह (Pravah / For You) vs नया (Naya / Latest) */}
      {!filterQuery && (
        <FeedTabs activeTab={activeTab} onTabChange={setActiveTab} />
      )}

      {/* Posts Stream */}
      <section className="home-feed-section">
        {loading ? (
          <PostCardSkeleton count={3} />
        ) : displayedPosts.length === 0 ? (
          <div className="feed-empty-state">
            <span className="empty-icon" style={{ display: "inline-flex", opacity: 0.6 }}>
              <StreamIcon size={44} />
            </span>
            <h3 className="empty-title">
              {filterQuery ? "कोई संबंधित विचार नहीं मिला" : "प्रवाह में कोई विचार नहीं है"}
            </h3>
            <p className="empty-desc">
              {filterQuery
                ? "कृपया अन्य विषय अथवा शब्द से खोजें।"
                : "प्रथम विचार प्रस्तुत कर विचार-प्रवाह का शुभारंभ करें।"}
            </p>
          </div>
        ) : (
          <div className="feed-stream-list">
            {visiblePosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                debug={isDebug}
                onPostDeleted={handlePostDeleted}
              />
            ))}

            {/* Infinite Scroll Lazy-Loading Sentinel (YouTube & X style) */}
            {visibleCount < displayedPosts.length && (
              <div ref={sentinelRef} className="feed-sentinel">
                {loadingMore && <PostCardSkeleton count={1} />}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
