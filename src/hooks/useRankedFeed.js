import { useState, useEffect, useRef } from "react";
import { rankPosts } from "../lib/ranking";
import { getSessionUIV } from "../lib/embeddings";
import { getUserBookmarks } from "../lib/firestore";

const RANK_CACHE_TTL = 60000; // 60 seconds cache

/**
 * Custom hook that ranks candidate posts by relevance to current user.
 * Employs in-memory 60s caching to prevent unnecessary re-computations.
 *
 * @param {Array<object>} rawPosts - Candidate posts from Firestore
 * @param {object|null} currentUser - Active authenticated user
 * @returns {{ rankedPosts: Array<object>, isRanking: boolean, refreshRanking: Function }}
 */
export function useRankedFeed(rawPosts = [], currentUser = null, enabled = true) {
  const [rankedPosts, setRankedPosts] = useState([]);
  const [isRanking, setIsRanking] = useState(false);
  const isMountedRef = useRef(true);

  const cacheRef = useRef({
    timestamp: 0,
    postsKey: "",
    result: []
  });

  const refreshRanking = async (force = false) => {
    if (!rawPosts || rawPosts.length === 0) {
      if (isMountedRef.current) setRankedPosts([]);
      return;
    }

    if (!enabled) {
      if (isMountedRef.current) setRankedPosts(rawPosts);
      return;
    }

    const now = Date.now();
    const postsKey = rawPosts.map((p) => `${p.id}_${p.likeCount || 0}_${p.replyCount || 0}`).join(",");

    // Use cached result if within 60 seconds and raw posts haven't mutated
    if (!force && cacheRef.current.postsKey === postsKey && (now - cacheRef.current.timestamp) < RANK_CACHE_TTL) {
      if (isMountedRef.current) setRankedPosts(cacheRef.current.result);
      return;
    }

    if (isMountedRef.current) setIsRanking(true);

    try {
      let uiv = null;

      // If user is authenticated, fetch their bookmarked/liked posts to construct or fetch UIV
      if (currentUser?.uid) {
        try {
          const userBookmarks = await getUserBookmarks(currentUser.uid);
          uiv = await getSessionUIV(currentUser.uid, userBookmarks);
        } catch (e) {
          uiv = null;
        }
      }

      // Rank candidate posts (capped at 200)
      const candidates = rawPosts.slice(0, 200);
      const ranked = rankPosts(candidates, {
        userInterestVector: uiv,
        now
      });

      cacheRef.current = {
        timestamp: now,
        postsKey,
        result: ranked
      };

      if (isMountedRef.current) setRankedPosts(ranked);
    } catch (err) {
      // Fallback gracefully to raw unranked candidates if ranking fails
      if (isMountedRef.current) setRankedPosts(rawPosts);
    } finally {
      if (isMountedRef.current) setIsRanking(false);
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    if (enabled) {
      refreshRanking(false);
    } else {
      setRankedPosts(rawPosts);
    }
    return () => { isMountedRef.current = false; };
  }, [rawPosts, currentUser?.uid, enabled]);

  return {
    rankedPosts,
    isRanking,
    refreshRanking: () => refreshRanking(true)
  };
}
