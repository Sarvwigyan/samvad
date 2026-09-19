import React, { useState, useEffect } from "react";
import { isFollowing, followUser, unfollowUser } from "../lib/firestore";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/Button";

export function FollowButton({ targetUid, onCountChange }) {
  const { currentUser, loginWithGoogle } = useAuth();
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialChecked, setInitialChecked] = useState(false);

  useEffect(() => {
    if (!currentUser || !targetUid || currentUser.uid === targetUid) return;
    let isMounted = true;
    isFollowing(currentUser.uid, targetUid).then((status) => {
      if (isMounted) {
        setFollowing(status);
        setInitialChecked(true);
      }
    });
    return () => { isMounted = false; };
  }, [currentUser, targetUid]);

  if (!currentUser) {
    return (
      <Button
        variant="primary"
        size="sm"
        onClick={loginWithGoogle}
        ariaLabel="अनुसरण हेतु प्रवेश करें"
      >
        अनुसरण करें (Follow)
      </Button>
    );
  }

  if (currentUser.uid === targetUid) return null;

  const handleToggle = async () => {
    if (loading) return;
    const previous = following;
    // Optimistic update
    setFollowing(!previous);
    if (onCountChange) onCountChange(!previous ? 1 : -1);
    setLoading(true);

    try {
      if (!previous) {
        await followUser(currentUser.uid, targetUid);
      } else {
        await unfollowUser(currentUser.uid, targetUid);
      }
    } catch (err) {
      console.error("Follow error, rolling back:", err);
      // Rollback on failure
      setFollowing(previous);
      if (onCountChange) onCountChange(previous ? 1 : -1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={following ? "secondary" : "primary"}
      size="sm"
      onClick={handleToggle}
      disabled={!initialChecked || loading}
      ariaLabel={following ? "अनुसरण समाप्त करें (Unfollow)" : "अनुसरण करें (Follow)"}
    >
      {following ? "अनुसरित (Following)" : "अनुसरण करें (Follow)"}
    </Button>
  );
}
