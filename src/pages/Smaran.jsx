import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getUserBookmarks } from "../lib/firestore";
import { PostCard } from "../components/PostCard";
import { Button } from "../components/ui/Button";
import { useNavigate } from "react-router-dom";

export default function Smaran() {
  const { currentUser, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    getUserBookmarks(currentUser.uid)
      .then((posts) => {
        if (isMounted) {
          setBookmarks(posts);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Error loading bookmarks:", err);
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="smaran-guest-container">
        <span className="smaran-glyph">🔖</span>
        <h3>स्मरण (Bookmarks)</h3>
        <p>अपने प्रिय विचारों को संचित एवं सुरक्षित रखने हेतु कृपया गूगल से प्रवेश करें।</p>
        <Button variant="primary" size="md" onClick={loginWithGoogle}>
          गूगल से प्रवेश करें (Sign in)
        </Button>
      </div>
    );
  }

  return (
    <div className="smaran-page">
      <div className="smaran-header-bar">
        <h2 className="smaran-page-title">🔖 संचित स्मरण (Bookmarks)</h2>
        <span className="smaran-count-badge">{bookmarks.length} विचार</span>
      </div>

      {loading ? (
        <div className="feed-empty-state">
          <div className="lotus-spinner">🪷</div>
          <p className="empty-title">स्मरण संचयन लोड हो रहा है...</p>
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="smaran-empty-state">
          <span className="smaran-empty-icon">🪷</span>
          <h3>कोई संचित स्मरण नहीं है</h3>
          <p>विचारों के नीचे 🔖 चिह्न पर क्लिक कर उन्हें अपने व्यक्तिगत स्मरण में संचित करें।</p>
          <Button variant="outline" size="sm" onClick={() => navigate("/")}>
            प्रवाह पर जाएँ (Explore Feed)
          </Button>
        </div>
      ) : (
        <div className="smaran-stream-list">
          {bookmarks.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
