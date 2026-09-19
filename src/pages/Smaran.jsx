import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getUserBookmarks } from "../lib/firestore";
import { PostCard } from "../components/PostCard";
import { PostCardSkeleton } from "../components/ui/PostCardSkeleton";
import { Button } from "../components/ui/Button";
import { BookmarkIcon } from "../components/ui/Icons";
import { useNavigate } from "react-router-dom";

export default function Smaran() {
  const { currentUser, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFolder, setActiveFolder] = useState("सभी");

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
        <span className="smaran-glyph"><BookmarkIcon size={32} /></span>
        <h3>स्मरण (Bookmarks)</h3>
        <p>अपने प्रिय विचारों को संचित एवं सुरक्षित रखने हेतु कृपया गूगल से प्रवेश करें।</p>
        <Button variant="primary" size="md" onClick={loginWithGoogle}>
          गूगल से प्रवेश करें (Sign in)
        </Button>
      </div>
    );
  }

  const folders = ["सभी", ...new Set(bookmarks.map(b => b.folder || "सामान्य"))];
  const displayedBookmarks = activeFolder === "सभी" ? bookmarks : bookmarks.filter(b => (b.folder || "सामान्य") === activeFolder);

  return (
    <div className="smaran-page">
      <div className="smaran-header-bar">
        <h2 className="smaran-page-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <BookmarkIcon size={20} /> संचित स्मरण (Bookmarks)
        </h2>
        <span className="smaran-count-badge">{bookmarks.length} विचार</span>
      </div>

      <div className="smaran-folders-row" style={{ padding: "0 16px 12px", display: "flex", gap: "8px", overflowX: "auto", borderBottom: "1px solid var(--border)" }}>
        {folders.map(folder => (
          <button
            key={folder}
            onClick={() => setActiveFolder(folder)}
            style={{
              padding: "6px 14px",
              borderRadius: "9999px",
              border: `1px solid ${activeFolder === folder ? "var(--sona)" : "var(--border)"}`,
              background: activeFolder === folder ? "var(--bg-elevated)" : "transparent",
              color: activeFolder === folder ? "var(--sona)" : "var(--text)",
              fontWeight: activeFolder === folder ? "bold" : "normal",
              cursor: "pointer",
              whiteSpace: "nowrap"
            }}
          >
            {folder}
          </button>
        ))}
      </div>

      {loading ? (
        <PostCardSkeleton count={3} />
      ) : displayedBookmarks.length === 0 ? (
        <div className="smaran-empty-state">
          <span className="smaran-empty-icon" style={{ display: "inline-flex", opacity: 0.6 }}>
            <BookmarkIcon size={44} />
          </span>
          <h3>कोई संचित स्मरण नहीं है</h3>
          <p>विचारों के नीचे स्मरण बटन पर क्लिक कर उन्हें अपने व्यक्तिगत संग्रह में संचित करें।</p>
          <Button variant="outline" size="sm" onClick={() => navigate("/")}>
            प्रवाह पर जाएँ (Explore Feed)
          </Button>
        </div>
      ) : (
        <div className="smaran-stream-list">
          {displayedBookmarks.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
