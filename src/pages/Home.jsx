import React, { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { collection, query, orderBy, limit, getDocs, startAfter, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { PostComposer } from "../components/PostComposer";
import { PostCard } from "../components/PostCard";
import { PostCardSkeleton } from "../components/ui/PostCardSkeleton";
import { FeedTabs, FEED_TAB_KEY, TAB_PRAVAH, TAB_NAYA, TAB_MANDAL } from "../components/FeedTabs";
import { useRankedFeed } from "../hooks/useRankedFeed";
import { SearchIcon, StreamIcon, UsersIcon, PlusIcon } from "../components/ui/Icons";
import { getUserCircles } from "../lib/circles";
import { CirclesModal } from "../components/CirclesModal";

const INITIAL_BATCH_SIZE = 15;
const BATCH_INCREMENT = 10;

export default function Home() {
  const { currentUser } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const filterQuery = searchParams.get("q") || "";
  const isDebug = searchParams.get("debug") === "1";

  // Cursor pagination states
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef(null);

  // Sadhak Circles (मण्डल) States
  const [circles, setCircles] = useState([]);
  const [selectedCircleId, setSelectedCircleId] = useState("all");
  const [isCirclesModalOpen, setIsCirclesModalOpen] = useState(false);

  useEffect(() => {
    getUserCircles(currentUser?.uid).then(setCircles);
  }, [currentUser?.uid]);

  const refreshCircles = () => {
    getUserCircles(currentUser?.uid).then(setCircles);
  };

  const [activeTab, setActiveTab] = useState(() => {
    try {
      const saved = localStorage.getItem(FEED_TAB_KEY);
      if (saved === TAB_PRAVAH || saved === TAB_NAYA || saved === TAB_MANDAL) return saved;
      return currentUser ? TAB_PRAVAH : TAB_NAYA;
    } catch (e) {
      return TAB_NAYA;
    }
  });

  const { rankedPosts } = useRankedFeed(posts, currentUser, activeTab === TAB_PRAVAH);

  const fetchPosts = async (isNextBatch = false) => {
    if (loadingMore) return;
    if (isNextBatch && !hasMore) return;
    
    setLoadingMore(isNextBatch);
    if (!isNextBatch) {
      setLoading(true);
      setPosts([]);
      setLastVisible(null);
      setHasMore(true);
    }

    try {
      let q;
      if (isNextBatch && lastVisible) {
        q = query(collection(db, "posts"), orderBy("createdAt", "desc"), startAfter(lastVisible), limit(BATCH_INCREMENT));
      } else {
        q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(INITIAL_BATCH_SIZE));
      }

      const snapshot = await getDocs(q);
      const newPosts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      if (snapshot.docs.length > 0) {
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      }
      
      if (snapshot.docs.length < (isNextBatch ? BATCH_INCREMENT : INITIAL_BATCH_SIZE)) {
        setHasMore(false);
      }

      setPosts(prev => {
        if (!isNextBatch) return newPosts;
        const existingIds = new Set(prev.map(p => p.id));
        const filteredNew = newPosts.filter(p => !existingIds.has(p.id));
        return [...prev, ...filteredNew];
      });
    } catch (err) {
      console.error("Feed error:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    let isCurrent = true;
    fetchPosts(false);
    return () => { isCurrent = false; };
  }, [activeTab, filterQuery]); // Refetch on tab or search change

  // Optional: Listen for very new posts to prepend them (lightweight listener)
  useEffect(() => {
    // Only listen to the top 1 newest post to catch new creations by others quickly
    const qNewest = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(1));
    const unsubscribe = onSnapshot(qNewest, (snapshot) => {
      if (snapshot.docs.length > 0) {
        const newest = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        setPosts((prev) => {
          if (!prev.length) return prev;
          if (prev.some(p => p.id === newest.id)) return prev;
          // Avoid pushing really old posts if the database is mostly empty
          const firstPostTime = prev[0]?.createdAt?.toMillis?.() || (prev[0]?.createdAt ? new Date(prev[0].createdAt).getTime() : 0);
          const newestTime = newest.createdAt?.toMillis?.() || Date.now();
          if (newestTime >= firstPostTime) {
            return [newest, ...prev];
          }
          return prev;
        });
      }
    }, (err) => {
      console.warn("Newest post listener notice:", err.message);
    });
    return () => unsubscribe();
  }, []);

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

  const mandalPosts = useMemo(() => {
    if (activeTab !== TAB_MANDAL) return [];
    if (selectedCircleId === "all") {
      const allMemberUids = new Set();
      circles.forEach((c) => (c.memberUids || []).forEach((u) => allMemberUids.add(u)));
      if (allMemberUids.size === 0) return posts;
      return posts.filter((p) => allMemberUids.has(p.authorId));
    }
    const target = circles.find((c) => c.id === selectedCircleId);
    if (!target || !target.memberUids || target.memberUids.length === 0) return [];
    const members = new Set(target.memberUids);
    return posts.filter((p) => members.has(p.authorId));
  }, [activeTab, selectedCircleId, circles, posts]);

  const candidatePosts = activeTab === TAB_PRAVAH ? rankedPosts : activeTab === TAB_MANDAL ? mandalPosts : posts;

  const displayedPosts = filterQuery
    ? candidatePosts.filter((p) => {
        const qLower = filterQuery.toLowerCase();
        return (
          (p.text || "").toLowerCase().includes(qLower) ||
          (p.bhav || "").toLowerCase().includes(qLower) ||
          (p.authorName || "").toLowerCase().includes(qLower)
        );
      })
    : candidatePosts;

  // Advanced IntersectionObserver for progressive infinite lazy loading (Server-side)
  useEffect(() => {
    if (
      !sentinelRef.current ||
      typeof window === "undefined" ||
      !("IntersectionObserver" in window) ||
      !hasMore || loadingMore || loading
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !loadingMore) {
          fetchPosts(true);
        }
      },
      { rootMargin: "400px" } // Pre-loads next batch 400px before reaching the bottom
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, lastVisible, filterQuery, activeTab]);

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

      {/* Feed Tabs: प्रवाह (Pravah / For You) vs नया (Naya / Latest) vs मण्डल (Circles) */}
      {!filterQuery && (
        <FeedTabs activeTab={activeTab} onTabChange={setActiveTab} />
      )}

      {/* Circles Sub-Ribbon */}
      {!filterQuery && activeTab === TAB_MANDAL && (
        <div className="home-circles-bar">
          <div className="home-circles-scroll">
            <button
              type="button"
              className={`circle-tab-pill ${selectedCircleId === "all" ? "active" : ""}`}
              onClick={() => setSelectedCircleId("all")}
            >
              <span>🌐 सभी मण्डल</span>
            </button>
            {circles.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`circle-tab-pill ${selectedCircleId === c.id ? "active" : ""}`}
                onClick={() => setSelectedCircleId(c.id)}
              >
                <span>{c.icon || "⭕"} {c.name}</span>
                <span className="circle-pill-count">({(c.memberUids || []).length})</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="manage-circles-btn"
            onClick={() => setIsCirclesModalOpen(true)}
            title="मण्डल प्रबंधित करें"
          >
            + प्रबंधित करें
          </button>
        </div>
      )}

      {/* Circles Modal */}
      <CirclesModal
        isOpen={isCirclesModalOpen}
        onClose={() => setIsCirclesModalOpen(false)}
        circles={circles}
        onCirclesUpdated={refreshCircles}
        currentUserId={currentUser?.uid}
      />

      {/* Posts Stream */}
      <section className="home-feed-section">
        {loading && posts.length === 0 ? (
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
            {displayedPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                debug={isDebug}
                onPostDeleted={handlePostDeleted}
              />
            ))}

            {/* Infinite Scroll Lazy-Loading Sentinel (YouTube & X style) */}
            {hasMore && (
              <div ref={sentinelRef} className="feed-sentinel" style={{ padding: "20px 0", textAlign: "center" }}>
                {loadingMore && <PostCardSkeleton count={1} />}
              </div>
            )}
            {!hasMore && displayedPosts.length > 0 && (
              <div className="feed-end-message" style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                आपने सभी विचार देख लिए हैं।
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
