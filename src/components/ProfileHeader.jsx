import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Avatar } from "./ui/Avatar";
import { Button } from "./ui/Button";
import { FollowButton } from "./FollowButton";
import { MapPinIcon, LinkIcon, MailIcon } from "./ui/Icons";

export function ProfileHeader({ profile, onEditClick }) {
  const { currentUser, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const isOwnProfile = currentUser && currentUser.uid === profile.uid;
  const [followerOffset, setFollowerOffset] = useState(0);

  const displayFollowers = Math.max(0, (profile.followersCount || 0) + followerOffset);
  const displayFollowing = profile.followingCount || 0;

  return (
    <div className="profile-header-card">
      {/* Banner */}
      <div className="profile-banner">
        {profile.bannerUrl ? (
          <img src={profile.bannerUrl} alt="बैनर" className="banner-image" />
        ) : (
          <div className="banner-fallback" />
        )}
      </div>

      {/* Main Info Box */}
      <div className="profile-main-meta">
        <div className="profile-avatar-row">
          <Avatar
            src={profile.avatarUrl}
            alt={profile.displayName}
            size="xl"
            fallbackText={profile.displayName}
            className="profile-avatar-large"
          />

          <div className="profile-action-btn-zone">
            {isOwnProfile ? (
              <Button variant="outline" size="sm" onClick={onEditClick}>
                संशोधन (Edit)
              </Button>
            ) : (
              <div className="profile-other-actions">
                <FollowButton
                  targetUid={profile.uid}
                  onCountChange={(delta) => setFollowerOffset((prev) => prev + delta)}
                />
                <button
                  type="button"
                  className="profile-dm-btn"
                  onClick={() => {
                    if (currentUser) {
                      navigate(`/sandesh?with=${profile.uid}`);
                    } else {
                      loginWithGoogle();
                    }
                  }}
                  title="व्यक्तिगत संदेश (DM) भेजें"
                  aria-label="संदेश भेजें"
                >
                  <MailIcon size={16} />
                  <span>संदेश</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Names & Handle */}
        <div className="profile-identity">
          <div className="profile-name-row">
            <h2 className="profile-display-name">{profile.displayName || "सुधी साधक"}</h2>
            {profile.verified && (
              <span className="profile-verified-badge" title="प्रमाणित प्रयोक्ता">
                ✓ प्रमाणित
              </span>
            )}
          </div>
          <span className="profile-handle">@{profile.username || "sadharak"}</span>
        </div>

        {/* Bio */}
        {profile.bio && <p className="profile-bio-text">{profile.bio}</p>}

        {/* Meta stats (Location / Website) */}
        <div className="profile-sub-details">
          {profile.location && (
            <span className="profile-detail-item">
              <MapPinIcon size={14} /> {profile.location}
            </span>
          )}
          {typeof profile.website === 'string' && profile.website && (
            <a
              href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="profile-detail-item profile-link"
            >
              <LinkIcon size={14} /> {profile.website.replace(/^https?:\/\//, "")}
            </a>
          )}
        </div>

        {/* Followers / Following Counts */}
        <div className="profile-social-counts">
          <Link to={`/parichay/${profile.uid}/anusarit`} className="social-stat-link">
            <strong className="stat-number">{displayFollowing}</strong>
            <span className="stat-label">अनुसरित (Following)</span>
          </Link>
          <Link to={`/parichay/${profile.uid}/anusari`} className="social-stat-link">
            <strong className="stat-number">{displayFollowers}</strong>
            <span className="stat-label">अनुसारी (Followers)</span>
          </Link>
          <span className="social-stat-link stat-plain">
            <strong className="stat-number">{profile.postsCount || 0}</strong>
            <span className="stat-label">विचार (Vichar)</span>
          </span>
        </div>
      </div>
    </div>
  );
}
