import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserProfile, getUserVichars, getProfileByUsername } from "../lib/firestore";
import { ProfileHeader } from "../components/ProfileHeader";
import { PostCard } from "../components/PostCard";
import { EditProfile } from "./EditProfile";
import { Button } from "../components/ui/Button";

export default function Profile() {
  const { uid } = useParams();
  const { currentUser, userProfile: myLiveProfile, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const targetUid = uid || currentUser?.uid;
  const isOwnProfile = currentUser && currentUser.uid === targetUid;

  const [profile, setProfile] = useState(() => {
    if (isOwnProfile && myLiveProfile) return myLiveProfile;
    if (isOwnProfile && currentUser) {
      return {
        uid: currentUser.uid,
        displayName: currentUser.displayName || "सुधी साधक",
        username: (currentUser.email ? currentUser.email.split("@")[0].replace(/[^a-z0-9_]/gi, "") : `user_${currentUser.uid.slice(0, 5)}`).toLowerCase(),
        avatarUrl: currentUser.photoURL || null,
        bannerUrl: null,
        bio: "",
        location: "",
        website: "",
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        createdAt: new Date()
      };
    }
    return null;
  });
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

    const fallbackProfile = (isOwnProfile && currentUser) ? {
      uid: currentUser.uid,
      displayName: currentUser.displayName || "सुधी साधक",
      username: (currentUser.email ? currentUser.email.split("@")[0].replace(/[^a-z0-9_]/gi, "") : `user_${currentUser.uid.slice(0, 5)}`).toLowerCase(),
      avatarUrl: currentUser.photoURL || null,
      bannerUrl: null,
      bio: "",
      location: "",
      website: "",
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      createdAt: new Date()
    } : null;

    async function loadData() {
      try {
        let prof = await getUserProfile(targetUid);
        let actualUid = targetUid;
        if (!prof) {
          prof = await getProfileByUsername(targetUid);
          if (prof?.uid) actualUid = prof.uid;
        }

        const userPosts = await getUserVichars(actualUid);
        if (isMounted) {
          const finalProf = prof || fallbackProfile;
          if (finalProf && !finalProf.postsCount && userPosts) {
            finalProf.postsCount = userPosts.length;
          }
          setProfile(finalProf);
          setPosts(userPosts || []);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading profile page:", err);
        if (isMounted) {
          if (fallbackProfile) setProfile(fallbackProfile);
          setLoading(false);
        }
      }
    }

    loadData();

    return () => { isMounted = false; };
  }, [targetUid, isOwnProfile, currentUser?.uid]);

  // Sync profile edits without triggering full post refetch
  useEffect(() => {
    if (isOwnProfile && myLiveProfile) {
      setProfile((prev) => (prev ? { ...prev, ...myLiveProfile } : myLiveProfile));
    }
  }, [isOwnProfile, myLiveProfile]);

  if (loading) {
    return (
      <div className="profile-loading-box">
        <div className="lotus-spinner">☸</div>
        <p>परिचय पत्रक लोड हो रहा है...</p>
      </div>
    );
  }

  if (!profile && !loading) {
    if (!currentUser && !uid) {
      return (
        <div className="smaran-guest-container">
          <span className="smaran-glyph">🪪</span>
          <h3>परिचय (Parichay)</h3>
          <p>अपना परिचय पत्रक देखने, विचार प्रबंधित करने एवं प्रोफ़ाइल संपादित करने हेतु कृपया गूगल से प्रवेश करें।</p>
          <Button variant="primary" size="md" onClick={loginWithGoogle}>
            गूगल से प्रवेश करें (Sign in)
          </Button>
        </div>
      );
    }
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
              <PostCard key={p.id} post={p} onPostDeleted={(id) => setPosts(prev => prev.filter(p => p.id !== id))} />
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
          onSaved={(updated) => setProfile((prev) => ({ ...prev, ...updated }))}
        />
      )}
    </div>
  );
}
