import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  listenNotifications,
  markNotificationRead,
  markAllNotificationsRead
} from "../lib/notifications";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { timeAgo } from "../lib/timeAgo";
import { triggerHaptic } from "../lib/haptics";
import {
  BellIcon,
  HeartIcon,
  ReplyIcon,
  RepostIcon,
  UsersIcon,
  AtIcon,
  CheckCheckIcon
} from "../components/ui/Icons";

const TAB_ALL = "all";
const TAB_MENTIONS = "mentions";
const TAB_LIKES = "likes";

export default function Notifications() {
  const { currentUser, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(TAB_ALL);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = listenNotifications(currentUser.uid, (items) => {
      setNotifications(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleNotificationClick = async (notif) => {
    triggerHaptic(8);
    if (!notif.read) {
      await markNotificationRead(currentUser.uid, notif.id);
    }
    if (notif.postId) {
      navigate(`/vichar/${notif.postId}`);
    } else if (notif.fromUid) {
      navigate(`/parichay/${notif.fromUid}`);
    }
  };

  const handleMarkAllRead = async () => {
    triggerHaptic(10);
    if (currentUser) {
      await markAllNotificationsRead(currentUser.uid);
    }
  };

  if (!currentUser) {
    return (
      <div className="guest-prompt-page">
        <div className="guest-prompt-card">
          <span className="guest-lotus-badge"><BellIcon size={36} /></span>
          <h3>सूचनाएँ देखने हेतु प्रवेश करें</h3>
          <p>गूगल से प्रवेश कर अपने विचारों पर होने वाली प्रतिक्रियाओं, उत्तरों व अनुसरित साधकों की सूचना प्राप्त करें।</p>
          <Button variant="primary" size="md" onClick={loginWithGoogle}>
            गूगल से प्रवेश (Sign in with Google)
          </Button>
        </div>
      </div>
    );
  }

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === TAB_MENTIONS) return n.type === "mention";
    if (activeTab === TAB_LIKES) return n.type === "like";
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const renderNotifIcon = (type) => {
    switch (type) {
      case "like":
        return <span className="notif-glyph glyph-like"><HeartIcon size={16} filled /></span>;
      case "reply":
        return <span className="notif-glyph glyph-reply"><ReplyIcon size={16} /></span>;
      case "repost":
        return <span className="notif-glyph glyph-repost"><RepostIcon size={16} /></span>;
      case "follow":
        return <span className="notif-glyph glyph-follow"><UsersIcon size={16} /></span>;
      case "mention":
        return <span className="notif-glyph glyph-mention"><AtIcon size={16} /></span>;
      default:
        return <span className="notif-glyph glyph-default"><BellIcon size={16} /></span>;
    }
  };

  const renderNotifMessage = (notif) => {
    switch (notif.type) {
      case "like":
        return (
          <>
            <strong>{notif.fromName}</strong> ने आपके विचार का <span>अनुमोदन</span> किया
          </>
        );
      case "reply":
        return (
          <>
            <strong>{notif.fromName}</strong> ने आपके विचार पर <span>उत्तर</span> दिया
          </>
        );
      case "repost":
        return (
          <>
            <strong>{notif.fromName}</strong> ने आपके विचार का <span>प्रसार</span> किया
          </>
        );
      case "follow":
        return (
          <>
            <strong>{notif.fromName}</strong> ने आपका <span>अनुसरण</span> प्रारंभ किया
          </>
        );
      case "mention":
        return (
          <>
            <strong>{notif.fromName}</strong> ने विचार में आपका <span>उल्लेख (@mention)</span> किया
          </>
        );
      default:
        return (
          <>
            <strong>{notif.fromName}</strong> की नवीन प्रतिक्रिया
          </>
        );
    }
  };

  return (
    <div className="notifications-page">
      {/* Top Header Bar */}
      <header className="notifications-header">
        <div className="notif-header-title-row">
          <h2 className="notif-main-title">सूचनाएँ (Notifications)</h2>
          {unreadCount > 0 && (
            <button
              type="button"
              className="mark-all-read-btn"
              onClick={handleMarkAllRead}
              title="सभी सूचनाओं को पढ़ा हुआ चिह्नित करें"
            >
              <CheckCheckIcon size={15} />
              <span>सभी पढ़ें</span>
            </button>
          )}
        </div>

        {/* Filter Tabs (All, Mentions, Likes) */}
        <div className="notif-tabs-bar">
          <button
            type="button"
            className={`notif-tab-pill ${activeTab === TAB_ALL ? "active" : ""}`}
            onClick={() => setActiveTab(TAB_ALL)}
          >
            सभी ({notifications.length})
          </button>
          <button
            type="button"
            className={`notif-tab-pill ${activeTab === TAB_MENTIONS ? "active" : ""}`}
            onClick={() => setActiveTab(TAB_MENTIONS)}
          >
            उल्लेख (@Mentions)
          </button>
          <button
            type="button"
            className={`notif-tab-pill ${activeTab === TAB_LIKES ? "active" : ""}`}
            onClick={() => setActiveTab(TAB_LIKES)}
          >
            अनुमोदन (Likes)
          </button>
        </div>
      </header>

      {/* Notifications Stream */}
      <div className="notifications-stream">
        {loading ? (
          <div className="notif-loading-box">
            <span className="lotus-spinner">☸</span>
            <p>सूचनाएँ प्राप्त हो रही हैं...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="notif-empty-box">
            <span className="empty-bell-icon"><BellIcon size={42} /></span>
            <h3 className="empty-title">
              {activeTab === TAB_MENTIONS
                ? "कोई उल्लेख नहीं मिला"
                : activeTab === TAB_LIKES
                ? "कोई नया अनुमोदन नहीं है"
                : "वर्तमान में कोई नई सूचना नहीं है"}
            </h3>
            <p className="empty-desc">
              विचार-प्रवाह में भाग लें। आपके विचारों पर होने वाली प्रतिक्रियाएँ यहाँ स्वतः प्रदर्शित होंगी।
            </p>
          </div>
        ) : (
          <div className="notif-list-container">
            {filteredNotifications.map((n) => (
              <article
                key={n.id}
                className={`notif-item-card ${n.read ? "is-read" : "is-unread"}`}
                onClick={() => handleNotificationClick(n)}
                role="button"
                tabIndex={0}
              >
                <div className="notif-icon-col">
                  {renderNotifIcon(n.type)}
                </div>

                <div className="notif-content-col">
                  <div className="notif-user-row">
                    <Link
                      to={`/parichay/${n.fromUid}`}
                      onClick={(e) => e.stopPropagation()}
                      className="notif-avatar-link"
                    >
                      <Avatar
                        src={n.fromPhoto}
                        alt={n.fromName}
                        size="sm"
                        fallbackText={n.fromName}
                      />
                    </Link>
                    <div className="notif-message-text">
                      <p className="notif-body-line">{renderNotifMessage(n)}</p>
                      <time className="notif-timestamp">{timeAgo(n.createdAt)}</time>
                    </div>
                  </div>

                  {/* Text preview if applicable */}
                  {n.postText && (
                    <blockquote className="notif-snippet-quote">
                      "{n.postText}"
                    </blockquote>
                  )}
                </div>

                {!n.read && <span className="notif-unread-dot" title="अपठित" />}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
