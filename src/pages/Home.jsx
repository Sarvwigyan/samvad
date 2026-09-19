import React, { useState, useEffect } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { PostComposer } from "../components/PostComposer";
import { PostCard } from "../components/PostCard";

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
        console.warn("Posts fetch notice:", err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handlePostCreated = (newPost) => {
    if (!newPost?.id) return;
    setPosts((prev) => {
      if (prev.some((p) => p.id === newPost.id)) return prev;
      return [newPost, ...prev];
    });
  };

  return (
    <div className="home-pravah-page">
      {/* Top Composer */}
      <section className="home-composer-section">
        <PostComposer onPostCreated={handlePostCreated} />
      </section>

      {/* Posts Stream */}
      <section className="home-feed-section">
        {loading ? (
          <div className="feed-empty-state">
            <div className="lotus-spinner">🪷</div>
            <p className="empty-title">प्रवाह लोड हो रहा है...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="feed-empty-state">
            <span className="empty-icon">🪷</span>
            <h3 className="empty-title">प्रवाह में कोई विचार नहीं है</h3>
            <p className="empty-desc">प्रथम विचार प्रस्तुत कर विचार-प्रवाह का शुभारंभ करें।</p>
          </div>
        ) : (
          <div className="feed-stream-list">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
