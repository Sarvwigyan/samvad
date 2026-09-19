import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getFollowing, getUserProfile } from "../lib/firestore";
import { Avatar } from "../components/ui/Avatar";
import { FollowButton } from "../components/FollowButton";

export default function Following() {
  const { uid } = useParams();
  const [targetUser, setTargetUser] = useState(null);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    Promise.all([getUserProfile(uid), getFollowing(uid)]).then(([user, list]) => {
      if (isMounted) {
        setTargetUser(user);
        setFollowing(list);
        setLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, [uid]);

  return (
    <div className="connections-page">
      <header className="connections-header">
        <Link to={`/parichay/${uid}`} className="back-link">
          ← {targetUser?.displayName || "परिचय"}
        </Link>
        <h2 className="connections-title">अनुसरित (Following)</h2>
      </header>

      {loading ? (
        <div className="feed-empty-state">
          <div className="lotus-spinner">🪷</div>
          <p>अनुसरित सूची लोड हो रही है...</p>
        </div>
      ) : following.length === 0 ? (
        <div className="feed-empty-state">
          <p className="empty-title">यह प्रयोक्ता किसी का अनुसरण नहीं कर रहे हैं।</p>
        </div>
      ) : (
        <div className="connections-list">
          {following.map((u) => (
            <div key={u.uid} className="connection-card">
              <Link to={`/parichay/${u.uid}`} className="connection-user-link">
                <Avatar src={u.avatarUrl || u.photoURL} alt={u.displayName} size="md" fallbackText={u.displayName} />
                <div className="connection-details">
                  <span className="connection-name">{u.displayName}</span>
                  <span className="connection-handle">@{u.username}</span>
                  {u.bio && <p className="connection-bio">{u.bio}</p>}
                </div>
              </Link>
              <FollowButton targetUid={u.uid} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
