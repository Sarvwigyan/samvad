import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { PostComposer } from "../components/PostComposer";
import { PostCard } from "../components/PostCard";

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const filterQuery = searchParams.get("q") || "";

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

  const handlePostCreated = (newPost) => {
    if (!newPost?.id) return;
    setPosts((prev) => {
      if (prev.some((p) => p.id === newPost.id)) return prev;
      return [newPost, ...prev];
    });
  };

  const displayedPosts = filterQuery
    ? posts.filter((p) => {
        const qLower = filterQuery.toLowerCase();
        return (
          p.text?.toLowerCase().includes(qLower) ||
          p.bhav?.toLowerCase().includes(qLower) ||
          p.authorName?.toLowerCase().includes(qLower)
        );
      })
    : posts;

  return (
    <div className="home-pravah-page">
      {/* Active Filter Banner if searching */}
      {filterQuery && (
        <div className="search-filter-banner">
          <span>🔍 खोज परिणाम: <strong>"{filterQuery}"</strong> ({displayedPosts.length} विचार)</span>
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

      {/* Posts Stream */}
      <section className="home-feed-section">
        {loading ? (
          <div className="feed-empty-state">
            <div className="lotus-spinner">🪷</div>
            <p className="empty-title">प्रवाह लोड हो रहा है...</p>
          </div>
        ) : displayedPosts.length === 0 ? (
          <div className="feed-empty-state">
            <span className="empty-icon">🪷</span>
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
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
