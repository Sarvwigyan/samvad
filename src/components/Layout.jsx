import React, { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { collection, query, orderBy, limit, onSnapshot, doc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Avatar } from "./ui/Avatar";
import { Button } from "./ui/Button";
import { usePWAInstall } from "../lib/usePWAInstall";
import { getSuggestedSadhaks, followUser, unfollowUser, isFollowing } from "../lib/firestore";
import { computeTrendingTopics } from "../lib/trending";
import { EcosystemBar } from "./EcosystemBar";
import { triggerHaptic } from "../lib/haptics";
import { listenUnreadCount } from "../lib/notifications";
import {
  StreamIcon,
  BookmarkIcon,
  ProfileIcon,
  SettingsIcon,
  DownloadIcon,
  GlobeIcon,
  BookIcon,
  LibraryIcon,
  SearchIcon,
  TrendingIcon,
  UsersIcon,
  QuoteIcon,
  MoonIcon,
  SunIcon,
  LogoutIcon,
  BellIcon,
  MailIcon
} from "./ui/Icons";

const CURATED_SADHAKS = [
  { uid: "curated_vidya", displayName: "भारतीय ज्ञान परम्परा", username: "bharat_vidya", avatarUrl: null, fallbackText: "ज्ञा" },
  { uid: "curated_sanskrit", displayName: "संस्कृत वाङ्मय", username: "sanskrit_sahitya", avatarUrl: null, fallbackText: "सं" },
  { uid: "curated_vedanta", displayName: "वेदान्त अनुसन्धान", username: "vedanta_darshan", avatarUrl: null, fallbackText: "वे" }
];

export function Layout() {
  const { currentUser, userProfile, loginWithGoogle, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { canInstall, isInstalled, promptInstall } = usePWAInstall();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobileChatActive = location.pathname.startsWith("/sandesh/") && location.pathname.length > 9;

  const [suggestedSadhaks, setSuggestedSadhaks] = useState([]);
  const [followingStates, setFollowingStates] = useState({});
  const [liveTrending, setLiveTrending] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isEcoDrawerOpen, setIsEcoDrawerOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  const myProfilePath = currentUser ? `/parichay/${currentUser.uid}` : "/parichay";

  useEffect(() => {
    if (!currentUser) {
      setUnreadNotifCount(0);
      return;
    }
    const unsubscribe = listenUnreadCount(currentUser.uid, (cnt) => {
      setUnreadNotifCount(cnt);
    });
    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    // Listen to global trending document
    const unsubscribe = onSnapshot(
      doc(db, "system", "trending"),
      (docSnap) => {
        if (docSnap.exists() && docSnap.data().tags) {
          const tagsObj = docSnap.data().tags;
          const topTags = Object.keys(tagsObj)
            .map(tag => ({ tag, count: tagsObj[tag], countLabel: `${tagsObj[tag]} विचार` }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 6);
          setLiveTrending(topTags);
        }
      },
      (err) => {
        console.warn("Trending listener notice:", err);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (currentUser) {
      getSuggestedSadhaks(currentUser.uid).then((sadhaks) => {
        if (!isMounted) return;
        if (sadhaks && sadhaks.length > 0) {
          setSuggestedSadhaks(sadhaks);
          sadhaks.forEach((s) => {
            isFollowing(currentUser.uid, s.uid).then((isF) => {
              if (isMounted) {
                setFollowingStates((prev) => ({ ...prev, [s.uid]: isF }));
              }
            }).catch(() => {});
          });
        } else {
          setSuggestedSadhaks(CURATED_SADHAKS);
        }
      }).catch(() => {
        if (isMounted) setSuggestedSadhaks(CURATED_SADHAKS);
      });
    } else {
      setSuggestedSadhaks(CURATED_SADHAKS);
    }

    return () => { isMounted = false; };
  }, [currentUser]);

  const handleFollowToggle = async (targetUid) => {
    if (!currentUser) {
      loginWithGoogle();
      return;
    }
    const current = Boolean(followingStates[targetUid]);
    setFollowingStates((prev) => ({ ...prev, [targetUid]: !current }));
    try {
      if (current) {
        await unfollowUser(currentUser.uid, targetUid);
      } else {
        await followUser(currentUser.uid, targetUid);
      }
    } catch (e) {
      console.warn("Follow toggle failed, reverting:", e);
      setFollowingStates((prev) => ({ ...prev, [targetUid]: current }));
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleTrendingClick = (tag) => {
    setSearchQuery(tag);
    navigate(`/?q=${encodeURIComponent(tag)}`);
  };

  return (
    <div className={`samvad-master-shell ${isMobileChatActive ? "in-mobile-chat" : ""}`}>
      <EcosystemBar />
      <div className="layout-shell-3col">
        {/* ========================================================
            LEFT COLUMN: Desktop Navigation Sidebar
            ======================================================== */}
      <aside className="left-sidebar-col">
        <div className="left-sidebar-sticky">
          {/* Logo & Platform Insignia */}
          <div className="brand-crest-box" onClick={() => navigate("/")} role="button" tabIndex={0}>
            <div className="dharmachakra-glow-badge" aria-hidden="true">
              ☸
            </div>
            <div className="brand-identity-text">
              <h1 className="brand-title-main">संवाद</h1>
              <span className="brand-tagline">SAMWAD • विचार-प्रवाह</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="primary-nav-menu">
            <NavLink
              to="/"
              className={({ isActive }) => `nav-menu-item ${isActive ? "active" : ""}`}
            >
              <span className="nav-item-icon"><StreamIcon size={22} /></span>
              <div className="nav-item-text">
                <span className="nav-label-hi">प्रवाह</span>
                <span className="nav-label-sub">Pravah (Stream)</span>
              </div>
            </NavLink>

            <NavLink
              to="/soochna"
              className={({ isActive }) => `nav-menu-item ${isActive ? "active" : ""}`}
            >
              <span className="nav-item-icon notif-icon-wrapper">
                <BellIcon size={22} />
                {unreadNotifCount > 0 && (
                  <span className="sidebar-unread-pill">{unreadNotifCount > 99 ? "99+" : unreadNotifCount}</span>
                )}
              </span>
              <div className="nav-item-text">
                <span className="nav-label-hi">सूचना</span>
                <span className="nav-label-sub">Soochna (Alerts)</span>
              </div>
            </NavLink>

            <NavLink
              to="/sandesh"
              className={({ isActive }) => `nav-menu-item ${isActive ? "active" : ""}`}
            >
              <span className="nav-item-icon"><MailIcon size={22} /></span>
              <div className="nav-item-text">
                <span className="nav-label-hi">संदेश</span>
                <span className="nav-label-sub">Sandesh (DMs)</span>
              </div>
            </NavLink>

            <NavLink
              to="/smaran"
              className={({ isActive }) => `nav-menu-item ${isActive ? "active" : ""}`}
            >
              <span className="nav-item-icon"><BookmarkIcon size={22} /></span>
              <div className="nav-item-text">
                <span className="nav-label-hi">स्मरण</span>
                <span className="nav-label-sub">Smaran (Saved)</span>
              </div>
            </NavLink>

            <NavLink
              to={myProfilePath}
              className={({ isActive }) => `nav-menu-item ${isActive ? "active" : ""}`}
            >
              <span className="nav-item-icon"><ProfileIcon size={22} /></span>
              <div className="nav-item-text">
                <span className="nav-label-hi">परिचय</span>
                <span className="nav-label-sub">Parichay (Profile)</span>
              </div>
            </NavLink>

            <NavLink
              to="/vyavastha"
              className={({ isActive }) => `nav-menu-item ${isActive ? "active" : ""}`}
            >
              <span className="nav-item-icon"><SettingsIcon size={22} /></span>
              <div className="nav-item-text">
                <span className="nav-label-hi">व्यवस्था</span>
                <span className="nav-label-sub">Vyavastha (Settings)</span>
              </div>
            </NavLink>
          </nav>

          {/* PWA Install Sidebar Button */}
          {canInstall && !isInstalled && (
            <button
              type="button"
              className="pwa-install-sidebar-btn"
              onClick={promptInstall}
              title="संवाद ऐप अपने उपकरण पर स्थापित करें"
            >
              <span className="pwa-icon"><DownloadIcon size={20} /></span>
              <div className="pwa-text">
                <strong>ऐप डाउनलोड / स्थापित करें</strong>
                <small>Install Standalone App</small>
              </div>
            </button>
          )}

          {/* User Account / Profile Badge at Bottom */}
          <div className="sidebar-bottom-account">
            {currentUser ? (
              <div className="user-profile-badge-card">
                <NavLink to={myProfilePath} className="user-badge-left">
                  <Avatar
                    src={userProfile?.avatarUrl || currentUser.photoURL}
                    alt={userProfile?.displayName || currentUser.displayName}
                    size="md"
                    fallbackText={userProfile?.displayName || currentUser.displayName}
                  />
                  <div className="user-badge-meta">
                    <span className="user-badge-name">
                      {userProfile?.displayName || currentUser.displayName || "सुधी साधक"}
                    </span>
                    <span className="user-badge-handle">
                      @{userProfile?.username || (currentUser.email ? currentUser.email.split("@")[0] : "sadharak")}
                    </span>
                  </div>
                </NavLink>

                <div className="user-badge-actions">
                  <button
                    type="button"
                    className="theme-quick-btn"
                    onClick={toggleTheme}
                    title="थीम बदलें"
                  >
                    {theme === "dark" ? <SunIcon size={17} /> : <MoonIcon size={17} />}
                  </button>
                  <button
                    type="button"
                    className="logout-quick-btn"
                    onClick={logout}
                    title="बहिर्गम (Logout)"
                  >
                    <LogoutIcon size={17} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="guest-login-sidebar-box">
                <Button variant="primary" size="md" onClick={loginWithGoogle} className="full-width">
                  गूगल से प्रवेश (Sign in)
                </Button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ========================================================
          CENTER COLUMN: Main Stream & Pages Viewport
          ======================================================== */}
      <main className="center-stream-col">
        {/* Sticky Mobile / Viewport Header with Top Parichay Profile Avatar */}
        <header className="center-stream-header">
          <div className="mobile-brand-row">
            {/* Parichay/Profile Avatar on Mobile Top Left (just like X and WhatsApp) */}
            <div
              className="mobile-avatar-trigger"
              onClick={() => {
                triggerHaptic(10);
                if (currentUser) {
                  navigate(myProfilePath);
                } else {
                  loginWithGoogle();
                }
              }}
              title={currentUser ? "परिचय (Profile)" : "प्रवेश करें"}
              role="button"
              tabIndex={0}
            >
              <Avatar
                src={userProfile?.avatarUrl || currentUser?.photoURL}
                alt={userProfile?.displayName || currentUser?.displayName || "साधक"}
                size="sm"
                fallbackText={userProfile?.displayName || currentUser?.displayName || "साधक"}
              />
            </div>

            <div className="mobile-brand-center" onClick={() => navigate("/")} role="button" tabIndex={0}>
              <span className="dharmachakra-mobile">☸</span>
              <h2 className="mobile-header-title">संवाद</h2>
            </div>

            <div className="mobile-header-controls">
              <button type="button" className="theme-quick-btn" onClick={toggleTheme} title="थीम बदलें">
                {theme === "dark" ? <SunIcon size={18} /> : <MoonIcon size={18} />}
              </button>
              {canInstall && !isInstalled && (
                <button type="button" className="mobile-pwa-btn" onClick={promptInstall} title="ऐप इंस्टॉल करें">
                  <DownloadIcon size={18} />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Page Content Rendered Here */}
        <div className="center-stream-content">
          <Outlet />
        </div>
      </main>

      {/* ========================================================
          RIGHT COLUMN: Trending Topics, Suggested Sadhaks, & Subhashita
          ======================================================== */}
      <aside className="right-widgets-col">
        <div className="right-widgets-sticky">
          {/* Functional Search Box */}
          <form className="search-widget-card" onSubmit={handleSearchSubmit}>
            <span className="search-icon"><SearchIcon size={18} /></span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="विचार, विषय अथवा साधक खोजें..."
              className="search-input-field"
              aria-label="खोज"
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => { setSearchQuery(""); navigate("/"); }}
              >
                ✕
              </button>
            )}
          </form>

          {/* Trending Topics / प्रवाहित विषय */}
          <section className="widget-card trending-widget-card">
            <div className="widget-header">
              <h3 className="widget-title">प्रवाहित विषय (Trending)</h3>
              <span className="widget-lotus"><TrendingIcon size={18} /></span>
            </div>
            <div className="trending-list">
              {liveTrending.length > 0 ? (
                liveTrending.map((topic) => (
                  <div
                    key={topic.tag}
                    className="trending-item"
                    onClick={() => handleTrendingClick(topic.tag)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="trending-meta">
                      <span className="trending-tag">{topic.tag}</span>
                      <span className="trending-desc">सक्रिय विचार-प्रवाह</span>
                    </div>
                    <span className="trending-count">{topic.countLabel}</span>
                  </div>
                ))
              ) : (
                <div className="trending-empty-hint">
                  <span className="hint-glyph"><TrendingIcon size={18} /></span>
                  <p className="hint-text">
                    विचारों में <strong>#हैशटैग</strong> का प्रयोग करें। वास्तविक समय में यहाँ लोकप्रिय विषय स्वतः प्रवाहित होंगे।
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Suggested Sadhaks (With Curated Fallbacks) */}
          <section className="widget-card">
            <div className="widget-header">
              <h3 className="widget-title">सुझावित साधक</h3>
              <span className="widget-lotus"><UsersIcon size={18} /></span>
            </div>
            <div className="sadhaks-list">
              {suggestedSadhaks.map((s) => (
                <div key={s.uid} className="sadhak-item-row">
                  <NavLink to={s.uid.startsWith("curated") ? "/" : `/parichay/${s.uid}`} className="sadhak-avatar-link">
                    <Avatar
                      src={s.avatarUrl}
                      alt={s.displayName}
                      size="sm"
                      fallbackText={s.fallbackText || s.displayName}
                    />
                    <div className="sadhak-names">
                      <span className="sadhak-display-name">{s.displayName || "सुधी साधक"}</span>
                      <span className="sadhak-handle">@{s.username || "sadharak"}</span>
                    </div>
                  </NavLink>
                  <button
                    type="button"
                    className={`follow-mini-btn ${followingStates[s.uid] ? "following" : ""}`}
                    onClick={() => handleFollowToggle(s.uid)}
                  >
                    {followingStates[s.uid] ? "अनुसरित" : "अनुसरण"}
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Daily Subhashita / अमृत वचन */}
          <section className="widget-card subhashita-card">
            <div className="widget-header">
              <h3 className="widget-title">दैनिक सुभाषित</h3>
              <span className="subhashita-feather"><QuoteIcon size={18} /></span>
            </div>
            <blockquote className="subhashita-quote">
              "अयं निजः परो वेति गणना लघुचेतसाम्।<br />
              उदारचरितानां तु वसुधैव कुटुम्बकम्॥"
            </blockquote>
            <cite className="subhashita-ref">— महोपनिषद् (४.७१)</cite>
          </section>

          {/* Sovereign Footer */}
          <footer className="right-col-footer">
            <div className="footer-links-row">
              <span>गोपनीयता</span> • <span>नियम</span> • <span>संवाद v0.4 (Phase 4)</span>
            </div>
            <p className="footer-copyright">
              © {new Date().getFullYear()} संवाद • भारतीय संस्कृति एवं सार्वभौमिक ज्ञान परम्परा
            </p>
          </footer>
        </div>
      </aside>
    </div>

      {/* ========================================================
          MOBILE BOTTOM NAVIGATION BAR (< 768px)
          5-Item Tactile 3D Tap Targets (≥ 48px)
          ======================================================== */}
      <nav className="mobile-bottom-nav" aria-label="मुख्य नेविगेशन">
        <NavLink
          to="/"
          className={({ isActive }) => `mobile-nav-btn ${isActive ? "active" : ""}`}
          onClick={() => triggerHaptic(10)}
        >
          <span className="nav-glyph"><StreamIcon size={22} /></span>
          <span className="nav-caption">प्रवाह</span>
        </NavLink>

        <NavLink
          to="/soochna"
          className={({ isActive }) => `mobile-nav-btn ${isActive ? "active" : ""}`}
          onClick={() => triggerHaptic(10)}
        >
          <span className="nav-glyph mobile-notif-wrap">
            <BellIcon size={22} />
            {unreadNotifCount > 0 && (
              <span className="mobile-unread-badge">{unreadNotifCount > 99 ? "99+" : unreadNotifCount}</span>
            )}
          </span>
          <span className="nav-caption">सूचना</span>
        </NavLink>

        <NavLink
          to="/sandesh"
          className={({ isActive }) => `mobile-nav-btn ${isActive ? "active" : ""}`}
          onClick={() => triggerHaptic(10)}
        >
          <span className="nav-glyph"><MailIcon size={22} /></span>
          <span className="nav-caption">संदेश</span>
        </NavLink>

        <NavLink
          to="/smaran"
          className={({ isActive }) => `mobile-nav-btn ${isActive ? "active" : ""}`}
          onClick={() => triggerHaptic(10)}
        >
          <span className="nav-glyph"><BookmarkIcon size={22} /></span>
          <span className="nav-caption">स्मरण</span>
        </NavLink>

        <NavLink
          to={myProfilePath}
          className={({ isActive }) => `mobile-nav-btn ${isActive ? "active" : ""}`}
          onClick={() => triggerHaptic(10)}
        >
          <span className="nav-glyph"><ProfileIcon size={22} /></span>
          <span className="nav-caption">परिचय</span>
        </NavLink>
      </nav>

      {/* Mobile Ecosystem Modal / Sheet */}
      {isEcoDrawerOpen && (
        <div className="modal-backdrop" onClick={() => setIsEcoDrawerOpen(false)}>
          <div className="modal-container eco-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="eco-modal-title-group">
                <h3 className="modal-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <GlobeIcon size={20} /> सर्वविज्ञान पारिस्थितिकी तंत्र
                </h3>
                <span className="eco-modal-sub">सार्वभौमिक ज्ञान, शास्त्र एवं अनुसंधान पोर्टल</span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsEcoDrawerOpen(false)}
                aria-label="बंद करें"
              >
                ✕
              </button>
            </div>

            <div className="modal-body eco-portals-list">
              <a
                href="https://sarvwigyan.github.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="eco-portal-item"
                onClick={() => triggerHaptic(10)}
              >
                <div className="eco-portal-icon"><GlobeIcon size={24} /></div>
                <div className="eco-portal-info">
                  <h4 className="eco-portal-name">सर्वविज्ञान Hub</h4>
                  <p className="eco-portal-desc">खुला विज्ञान, शिक्षा एवं शोध केंद्र (sarvwigyan.github.io)</p>
                </div>
                <span className="eco-portal-arrow">↗</span>
              </a>

              <a
                href="https://sarvwigyan.github.io/sarvpedia/"
                target="_blank"
                rel="noopener noreferrer"
                className="eco-portal-item"
                onClick={() => triggerHaptic(10)}
              >
                <div className="eco-portal-icon"><BookIcon size={24} /></div>
                <div className="eco-portal-info">
                  <h4 className="eco-portal-name">सर्वपीडिया (Sarvpedia)</h4>
                  <p className="eco-portal-desc">वैदिक एवं आधुनिक तत्वों का ज्ञानकोश (१०८ विषय)</p>
                </div>
                <span className="eco-portal-arrow">↗</span>
              </a>

              <a
                href="https://sarvwigyan.github.io/sarvstore/"
                target="_blank"
                rel="noopener noreferrer"
                className="eco-portal-item"
                onClick={() => triggerHaptic(10)}
              >
                <div className="eco-portal-icon"><LibraryIcon size={24} /></div>
                <div className="eco-portal-info">
                  <h4 className="eco-portal-name">सर्वसंग्रह (Sarvstore / Kosh)</h4>
                  <p className="eco-portal-desc">प्राचीन ग्रंथ, संहिताएँ एवं आधुनिक शोध-पत्रिकाएँ</p>
                </div>
                <span className="eco-portal-arrow">↗</span>
              </a>

              <div className="eco-portal-item active-current">
                <div className="eco-portal-icon">☸</div>
                <div className="eco-portal-info">
                  <h4 className="eco-portal-name">संवाद (Samwad)</h4>
                  <p className="eco-portal-desc">सक्रिय विचार-विमर्श एवं सामुदायिक संवाद मंच (वर्तमान)</p>
                </div>
                <span className="eco-current-badge">सक्रिय</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
