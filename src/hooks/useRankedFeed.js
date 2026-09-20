import { useState, useEffect, useRef, useCallback } from "react";
import { rankPosts } from "../lib/ranking";
import { getSessionUIV } from "../lib/embeddings";
import { getUserBookmarks } from "../lib/firestore";

/**
 * Custom hook that ranks candidate posts by relevance to current user.
 * Implements two-phase stable ranking to ensure already displayed posts
 * are not reshuffled when new pages are fetched via infinite scroll.
 *
 * @param {Array<object>} rawPosts - Candidate posts from Firestore
 * @param {object|null} currentUser - Active authenticated user
 * @param {boolean} enabled - Whether ranking is active
 * @returns {{ rankedPosts: Array<object>, isRanking: boolean, refreshRanking: Function, resetRanking: Function }}
 */
export function useRankedFeed(rawPosts = [], currentUser = null, enabled = true) {
  const [rankedPosts, setRankedPosts] = useState([]);
  const [isRanking, setIsRanking] = useState(false);
  const isMountedRef = useRef(true);
  const rankedIdsRef = useRef(new Set());
  const cachedUivRef = useRef(null);

  const resetRanking = useCallback(() => {
    rankedIdsRef.current.clear();
    cachedUivRef.current = null;
    setRankedPosts([]);
  }, []);

  const refreshRanking = async (force = false) => {
    if (!rawPosts || rawPosts.length === 0) {
      if (isMountedRef.current) {
        setRankedPosts([]);
        rankedIdsRef.current.clear();
      }
      return;
    }

    if (!enabled) {
      if (isMountedRef.current) {
        setRankedPosts(rawPosts);
      }
      return;
    }

    // Determine unranked new posts
    const isFirstLoadOrReset = force || rankedIdsRef.current.size === 0;
    const newPosts = isFirstLoadOrReset
      ? rawPosts
      : rawPosts.filter((p) => p?.id && !rankedIdsRef.current.has(p.id));

    if (!isFirstLoadOrReset && newPosts.length === 0) {
      return;
    }

    if (isMountedRef.current) setIsRanking(true);

    try {
      const now = Date.now();
      let uiv = cachedUivRef.current;

      // Fetch or refresh UIV if needed
      if (!uiv && currentUser?.uid) {
        try {
          const userBookmarks = await getUserBookmarks(currentUser.uid);
          uiv = await getSessionUIV(currentUser.uid, userBookmarks);
          cachedUivRef.current = uiv;
        } catch (e) {
          uiv = null;
        }
      }

      if (isFirstLoadOrReset) {
        // Rank all candidate posts (capped at 200)
        const candidates = rawPosts.slice(0, 200);
        const ranked = rankPosts(candidates, {
          userInterestVector: uiv,
          now
        });

        rankedIdsRef.current = new Set(ranked.map((p) => p.id));
        if (isMountedRef.current) setRankedPosts(ranked);
      } else {
        // Rank only new incoming posts with same UIV and append to existing rankedPosts
        const rankedNew = rankPosts(newPosts, {
          userInterestVector: uiv,
          now
        });

        rankedNew.forEach((p) => {
          if (p.id) rankedIdsRef.current.add(p.id);
        });

        if (isMountedRef.current) {
          setRankedPosts((prev) => {
            const prevIds = new Set(prev.map((p) => p.id));
            const distinctNew = rankedNew.filter((p) => !prevIds.has(p.id));
            return [...prev, ...distinctNew];
          });
        }
      }
    } catch (err) {
      // Fallback gracefully to raw unranked candidates if ranking fails
      if (isMountedRef.current) {
        if (isFirstLoadOrReset) {
          setRankedPosts(rawPosts);
          rankedIdsRef.current = new Set(rawPosts.map((p) => p.id));
        } else {
          setRankedPosts((prev) => [...prev, ...newPosts]);
          newPosts.forEach((p) => {
            if (p.id) rankedIdsRef.current.add(p.id);
          });
        }
      }
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
    refreshRanking: () => refreshRanking(true),
    resetRanking
  };
}
