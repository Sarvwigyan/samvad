import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getVicharById,
  getPostReplies,
  createUttar,
  isPostLiked,
  toggleAnumodan,
  isPostReposted,
  togglePrasar,
  isPostBookmarked,
  toggleSmaran
} from "../lib/firestore";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { timeAgo } from "../lib/timeAgo";
import { playTempleChime } from "../lib/chime";
import {
  HeartIcon,
  RepostIcon,
  BookmarkIcon,
  ShareIcon
} from "../components/ui/Icons";

export default function VicharDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, userProfile, loginWithGoogle } = useAuth();

  const [post, setPost] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Interaction states for main post
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [reposted, setReposted] = useState(false);
  const [repostCount, setRepostCount] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);

  // Reply Composer state
  const [replyText, setReplyText] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replyError, setReplyError] = useState("");
  const [copiedToast, setCopiedToast] = useState(false);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    setLoading(true);

    Promise.all([
      getVicharById(id),
      getPostReplies(id)
    ]).then(([postData, replyList]) => {
      if (isMounted && postData) {
        setPost(postData);
        setLikeCount(postData.likeCount || 0);
        setRepostCount(postData.repostCount || 0);
        setReplies(replyList || []);
        setLoading(false);

        if (currentUser) {
          isPostLiked(id, currentUser.uid).then((val) => isMounted && setLiked(val));
          isPostReposted(id, currentUser.uid).then((val) => isMounted && setReposted(val));
          isPostBookmarked(id, currentUser.uid).then((val) => isMounted && setBookmarked(val));
        }
      } else if (isMounted) {
        setLoading(false);
      }
    }).catch((err) => {
      console.error("Error loading Vichar thread:", err);
      if (isMounted) setLoading(false);
    });

    return () => { isMounted = false; };
  }, [id, currentUser]);

  const handleAnumodan = async () => {
    if (!currentUser) {
      loginWithGoogle();
      return;
    }
    const prevLiked = liked;
    const prevCount = likeCount;
    setLiked(!prevLiked);
    setLikeCount(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1);

    if (!prevLiked) playTempleChime();

    try {
      await toggleAnumodan(post.id, currentUser.uid);
    } catch (e) {
      setLiked(prevLiked);
      setLikeCount(prevCount);
    }
  };

  const handlePrasar = async () => {
    if (!currentUser) {
      loginWithGoogle();
      return;
    }
    const prevReposted = reposted;
    const prevCount = repostCount;
    setReposted(!prevReposted);
    setRepostCount(prevReposted ? Math.max(0, prevCount - 1) : prevCount + 1);

    try {
      await togglePrasar(post.id, currentUser.uid);
    } catch (e) {
      setReposted(prevReposted);
      setRepostCount(prevCount);
    }
  };

  const handleSmaran = async () => {
    if (!currentUser) {
      loginWithGoogle();
      return;
    }
    const prevBookmarked = bookmarked;
    setBookmarked(!prevBookmarked);

    try {
      await toggleSmaran(post.id, currentUser.uid);
    } catch (e) {
      setBookmarked(prevBookmarked);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "संवाद — विचार संवाद",
          text: post.text,
          url
        });
      } catch {}
    } else {
      navigator.clipboard?.writeText(url);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2000);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      setReplyError("उत्तर प्रेषित करने हेतु गूगल से प्रवेश आवश्यक है");
      return;
    }
    const clean = replyText.trim();
    if (!clean) return;
    if (clean.length > 500) {
      setReplyError("उत्तर अधिकतम 500 अक्षरों तक ही सीमित है");
      return;
    }

    setIsSendingReply(true);
    setReplyError("");

    try {
      const newReply = await createUttar(post.id, {
        authorId: currentUser.uid,
        authorName: userProfile?.displayName || currentUser.displayName || "सुधी साधक",
        authorPhoto: userProfile?.avatarUrl || currentUser.photoURL || null,
        text: clean,
        isAnonymous
      });

      playTempleChime();
      setReplyText("");
      setReplies((prev) => [...prev, newReply]);
      setPost((prev) => ({ ...prev, replyCount: (prev.replyCount || 0) + 1 }));
    } catch (err) {
      console.error("Reply creation error:", err);
      setReplyError("उत्तर प्रेषित नहीं हो सका। कृपया पुनः प्रयास करें।");
    } finally {
      setIsSendingReply(false);
    }
  };

  if (loading) {
    return (
      <div className="thread-loading-box">
        <div className="lotus-spinner">☸</div>
        <p>विचार प्रवाह लोड हो रहा है...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="thread-not-found">
        <span className="not-found-glyph">❓</span>
        <h3>विचार उपलब्ध नहीं है</h3>
        <p>यह विचार विद्यमान नहीं है अथवा हटाया जा चुका है।</p>
        <Button variant="primary" size="sm" onClick={() => navigate("/")}>
          प्रवाह पर लौटें (Return Home)
        </Button>
      </div>
    );
  }

  const authorLink = post.isAnonymous || !post.authorId ? null : `/parichay/${post.authorId}`;

  // Dynamically resolve author name and photo for current user
  const isAuthorCurrentUser = currentUser && post.authorId === currentUser.uid;
  const displayAuthorName = (!post.isAnonymous && isAuthorCurrentUser && userProfile?.displayName)
    ? userProfile.displayName
    : (post.authorName || "सुधी साधक");

  const displayAuthorPhoto = (!post.isAnonymous && isAuthorCurrentUser && userProfile?.avatarUrl !== undefined)
    ? userProfile.avatarUrl
    : post.authorPhoto;

  return (
    <div className="vichar-detail-page">
      {/* Header bar */}
      <div className="detail-header-nav">
        <button type="button" className="back-nav-btn" onClick={() => navigate(-1)}>
          ← वापस
        </button>
        <h2 className="detail-title">विचार विमर्श (Thread)</h2>
      </div>

      {/* Main Vichar Document */}
      <article className="main-vichar-card">
        <header className="main-vichar-author">
          <div className="author-meta-block">
            {authorLink ? (
              <Link to={authorLink}>
                <Avatar
                  src={displayAuthorPhoto}
                  alt={displayAuthorName}
                  size="lg"
                  fallbackText={displayAuthorName}
                />
              </Link>
            ) : (
              <Avatar
                src={displayAuthorPhoto}
                alt={displayAuthorName}
                size="lg"
                fallbackText="साधक"
              />
            )}
            <div className="author-text-meta">
              {authorLink ? (
                <Link to={authorLink} className="author-display-link">
                  {displayAuthorName}
                </Link>
              ) : (
                <span className="author-display-text">
                  {displayAuthorName}
                </span>
              )}
              <span className="author-handle">
                {post.isAnonymous ? "गुप्त साधक" : timeAgo(post.createdAt)}
              </span>
            </div>
          </div>

          {post.bhav && (
            <span className="bhav-badge-large">{post.bhav}</span>
          )}
        </header>

        <div className="main-vichar-text">
          {post.text}
        </div>

        <div className="main-vichar-timestamp">
          <span>{timeAgo(post.createdAt)}</span> • <span>सार्वजनिक प्रवाह</span>
        </div>

        {/* Counter Stats Bar */}
        <div className="detail-metrics-row">
          <div className="metric-item">
            <strong>{likeCount}</strong> <span>अनुमोदन</span>
          </div>
          <div className="metric-item">
            <strong>{replies.length}</strong> <span>उत्तर</span>
          </div>
          <div className="metric-item">
            <strong>{repostCount}</strong> <span>प्रसार</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="detail-actions-bar">
          <button
            type="button"
            className={`detail-action-btn ${liked ? "active-anumodan" : ""}`}
            onClick={handleAnumodan}
            title="अनुमोदन (Like)"
          >
            <span className="action-icon">
              <HeartIcon size={18} filled={liked} />
            </span>
            <span>अनुमोदन</span>
          </button>

          <button
            type="button"
            className={`detail-action-btn ${reposted ? "active-prasar" : ""}`}
            onClick={handlePrasar}
            title="प्रसार (Repost)"
          >
            <span className="action-icon">
              <RepostIcon size={18} />
            </span>
            <span>प्रसार</span>
          </button>

          <button
            type="button"
            className={`detail-action-btn ${bookmarked ? "active-smaran" : ""}`}
            onClick={handleSmaran}
            title="स्मरण (Bookmark)"
          >
            <span className="action-icon">
              <BookmarkIcon size={18} filled={bookmarked} />
            </span>
            <span>स्मरण</span>
          </button>

          <button
            type="button"
            className="detail-action-btn"
            onClick={handleShare}
            title="संक्रमण (Share)"
          >
            <span className="action-icon">
              <ShareIcon size={18} />
            </span>
            <span>{copiedToast ? "प्रतिलिपि!" : "साझा"}</span>
          </button>
        </div>
      </article>

      {/* Reply Composer */}
      <section className="reply-composer-container">
        {currentUser ? (
          <form className="reply-form" onSubmit={handleSendReply}>
            <div className="reply-input-row">
              <Avatar
                src={userProfile?.avatarUrl || currentUser.photoURL}
                alt={userProfile?.displayName || currentUser.displayName}
                size="md"
                fallbackText={userProfile?.displayName || currentUser.displayName}
              />
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="सादर उत्तर प्रेषित करें... (Reply)"
                className="reply-textarea"
                rows={2}
                maxLength={500}
                disabled={isSendingReply}
              />
            </div>

            {replyError && <p className="reply-error-text">⚠️ {replyError}</p>}

            <div className="reply-footer-row">
              <button
                type="button"
                className={`anon-toggle-sm ${isAnonymous ? "active" : ""}`}
                onClick={() => setIsAnonymous(!isAnonymous)}
              >
                {isAnonymous ? "गुप्त उत्तर" : "आत्म-पहचान"}
              </button>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSendingReply || !replyText.trim()}
                loading={isSendingReply}
              >
                उत्तर दें (Reply)
              </Button>
            </div>
          </form>
        ) : (
          <div className="reply-guest-banner">
            <p>उत्तर प्रेषित करने हेतु कृपया गूगल से प्रवेश करें।</p>
            <Button variant="primary" size="sm" onClick={loginWithGoogle}>
              गूगल प्रवेश
            </Button>
          </div>
        )}
      </section>

      {/* Threaded Replies Stream */}
      <section className="replies-stream-section">
        <h3 className="replies-stream-heading">
          उत्तर-परम्परा ({replies.length})
        </h3>

        {replies.length === 0 ? (
          <div className="empty-replies-box">
            <p>अभी तक कोई उत्तर नहीं है। प्रथम विचार-प्रतिक्रिया दें।</p>
          </div>
        ) : (
          <div className="replies-list">
            {replies.map((reply) => {
              const rLink = reply.isAnonymous || !reply.authorId ? null : `/parichay/${reply.authorId}`;
              const isReplyCurrentUser = currentUser && reply.authorId === currentUser.uid;
              const displayReplyName = (!reply.isAnonymous && isReplyCurrentUser && userProfile?.displayName)
                ? userProfile.displayName
                : (reply.authorName || "सुधी साधक");

              const displayReplyPhoto = (!reply.isAnonymous && isReplyCurrentUser && userProfile?.avatarUrl !== undefined)
                ? userProfile.avatarUrl
                : reply.authorPhoto;

              return (
                <div key={reply.id} className="reply-item-card">
                  <div className="reply-author-row">
                    {rLink ? (
                      <Link to={rLink}>
                        <Avatar
                          src={displayReplyPhoto}
                          alt={displayReplyName}
                          size="sm"
                          fallbackText={displayReplyName}
                        />
                      </Link>
                    ) : (
                      <Avatar
                        src={displayReplyPhoto}
                        alt={displayReplyName}
                        size="sm"
                        fallbackText="साधक"
                      />
                    )}
                    <div className="reply-meta">
                      {rLink ? (
                        <Link to={rLink} className="reply-author-name">
                          {displayReplyName}
                        </Link>
                      ) : (
                        <span className="reply-author-name">
                          {displayReplyName}
                        </span>
                      )}
                      <span className="reply-time">{timeAgo(reply.createdAt)}</span>
                    </div>
                  </div>
                  <p className="reply-text-content">{reply.text}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
