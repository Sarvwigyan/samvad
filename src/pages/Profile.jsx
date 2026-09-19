import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserProfile, getUserVichars } from "../lib/firestore";
import { ProfileHeader } from "../components/ProfileHeader";
import { PostCard } from "../components/PostCard";
import { EditProfile } from "./EditProfile";

export default function Profile() {
  const { uid } = useParams();
  const { currentUser, userProfile: myLiveProfile } = useAuth();
  const navigate = useNavigate();

  const targetUid = uid || currentUser?.uid;
  const isOwnProfile = currentUser && currentUser.uid === targetUid;

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    if (!targetUid) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    // If viewing own profile, start with myLiveProfile
    if (isOwnProfile && myLiveProfile) {
      setProfile(myLiveProfile);
    }

    Promise.all([
      getUserProfile(targetUid),
      getUserVichars(targetUid)
    ]).then(([prof, userPosts]) => {
      if (isMounted) {
        setProfile(prof);
        setPosts(userPosts);
        setLoading(false);
      }
    }).catch((err) => {
      console.error("Error loading profile page:", err);
      if (isMounted) setLoading(false);
    });

    return () => { isMounted = false; };
  }, [targetUid, isOwnProfile, myLiveProfile]);

  if (loading) {
    return (
      <div className="profile-loading-box">
        <div className="lotus-spinner">🪷</div>
        <p>परिचय पत्रक लोड हो रहा है...</p>
      </div>
    );
  }

  if (!profile && !loading) {
    return (
      <div className="profile-not-found">
        <span className="not-found-glyph">❓</span>
        <h3>प्रयोक्ता परिचय उपलब्ध नहीं है</h3>
        <p>यह प्रोफ़ाइल विद्यमान नहीं है अथवा हटाई जा चुकी है।</p>
        <button className="btn-primitive btn-primary btn-sm" onClick={() => navigate("/")}>
          प्रवाह पर लौटें (Return Home)
        </button>
      </div>
    );
  }

  return (
    <div className="profile-page-shell">
      <ProfileHeader
        profile={profile}
        onEditClick={() => setIsEditModalOpen(true)}
      />

      {/* User's Vichar Feed */}
      <section className="profile-posts-stream">
        <h3 className="section-title">विचार (Vichar)</h3>
        {posts.length === 0 ? (
          <div className="empty-profile-posts">
            <p>इस प्रयोक्ता ने अभी तक कोई विचार प्रेषित नहीं किया है।</p>
          </div>
        ) : (
          <div className="profile-post-list">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        )}
      </section>

      {/* Edit Profile Modal */}
      {isOwnProfile && isEditModalOpen && (
        <EditProfile
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          profile={profile}
          onSaved={(updated) => setProfile(updated)}
        />
      )}
    </div>
  );
}
