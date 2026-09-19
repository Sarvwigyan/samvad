import React, { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Avatar } from "./ui/Avatar";
import { Button } from "./ui/Button";
import { usePWAInstall } from "../lib/usePWAInstall";
import { getSuggestedSadhaks, followUser, unfollowUser, isFollowing } from "../lib/firestore";

const TRENDING_TOPICS = [
  { tag: "#वेदान्त", desc: "उपनिषदों का गहन तत्त्वज्ञान", count: "1.2k विचार" },
  { tag: "#न्यायदर्शन", desc: "तर्कशास्त्र, प्रमाण एवं मीमांसा", count: "840 विचार" },
  { tag: "#संस्कृत", desc: "देववाणी एवं शास्त्रीय व्याकरण", count: "2.5k विचार" },
  { tag: "#आयुर्वेद", desc: "जीवन, स्वास्थ्य एवं औषधि विज्ञान", count: "950 विचार" },
  { tag: "#वैशेषिक", desc: "पदार्थ, परमाणु एवं भौतिक चिन्तन", count: "420 विचार" }
];

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

  const [suggestedSadhaks, setSuggestedSadhaks] = useState([]);
  const [followingStates, setFollowingStates] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

  const myProfilePath = currentUser ? `/parichay/${currentUser.uid}` : "/parichay";

  useEffect(() => {
    if (currentUser) {
      getSuggestedSadhaks(currentUser.uid).then((sadhaks) => {
        if (sadhaks && sadhaks.length > 0) {
          setSuggestedSadhaks(sadhaks);
          sadhaks.forEach((s) => {
            isFollowing(currentUser.uid, s.uid).then((isF) => {
              setFollowingStates((prev) => ({ ...prev, [s.uid]: isF }));
            });
          });
        } else {
          setSuggestedSadhaks(CURATED_SADHAKS);
        }
      });
    } else {
      setSuggestedSadhaks(CURATED_SADHAKS);
    }
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
              <span className="nav-item-icon">🌊</span>
              <div className="nav-item-text">
                <span className="nav-label-hi">प्रवाह</span>
                <span className="nav-label-sub">Pravah (Stream)</span>
              </div>
            </NavLink>

            <NavLink
              to="/smaran"
              className={({ isActive }) => `nav-menu-item ${isActive ? "active" : ""}`}
            >
              <span className="nav-item-icon">🔖</span>
              <div className="nav-item-text">
                <span className="nav-label-hi">स्मरण</span>
                <span className="nav-label-sub">Smaran (Saved)</span>
              </div>
            </NavLink>

            <NavLink
              to={myProfilePath}
              className={({ isActive }) => `nav-menu-item ${isActive ? "active" : ""}`}
            >
              <span className="nav-item-icon">🪪</span>
              <div className="nav-item-text">
                <span className="nav-label-hi">परिचय</span>
                <span className="nav-label-sub">Parichay (Profile)</span>
              </div>
            </NavLink>

            <NavLink
              to="/vyavastha"
              className={({ isActive }) => `nav-menu-item ${isActive ? "active" : ""}`}
            >
              <span className="nav-item-icon">⚙️</span>
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
              <span className="pwa-icon">📲</span>
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
                    {theme === "dark" ? "☀️" : "🌙"}
                  </button>
                  <button
                    type="button"
                    className="logout-quick-btn"
                    onClick={logout}
                    title="बहिर्गम (Logout)"
                  >
                    🚪
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
        {/* Sticky Mobile / Viewport Header */}
        <header className="center-stream-header">
          <div className="mobile-brand-row">
            <div className="dharmachakra-mobile" onClick={() => navigate("/")}>☸</div>
            <h2 className="mobile-header-title">संवाद</h2>
            <div className="mobile-header-controls">
              <button type="button" className="theme-quick-btn" onClick={toggleTheme}>
                {theme === "dark" ? "☀️" : "🌙"}
              </button>
              {canInstall && !isInstalled && (
                <button type="button" className="mobile-pwa-btn" onClick={promptInstall} title="ऐप इंस्टॉल करें">
                  📲
                </button>
              )}
            </div>
          </div>
          <div className="shloka-header-banner">
            <span>✦ सत्यं वद • धर्मं चर • ज्ञानमेव जयते ✦</span>
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
            <span className="search-icon">🔍</span>
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
          <section className="widget-card">
            <div className="widget-header">
              <h3 className="widget-title">प्रवाहित विषय (Trending)</h3>
              <span className="widget-lotus">🪷</span>
            </div>
            <div className="trending-list">
              {TRENDING_TOPICS.map((topic) => (
                <div
                  key={topic.tag}
                  className="trending-item"
                  onClick={() => handleTrendingClick(topic.tag)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="trending-meta">
                    <span className="trending-tag">{topic.tag}</span>
                    <span className="trending-desc">{topic.desc}</span>
                  </div>
                  <span className="trending-count">{topic.count}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Suggested Sadhaks (With Curated Fallbacks) */}
          <section className="widget-card">
            <div className="widget-header">
              <h3 className="widget-title">सुझावित साधक</h3>
              <span className="widget-lotus">👥</span>
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
              <span className="subhashita-feather">📜</span>
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

      {/* ========================================================
          MOBILE BOTTOM NAVIGATION BAR (< 768px)
          ======================================================== */}
      <nav className="mobile-bottom-nav">
        <NavLink to="/" className={({ isActive }) => `mobile-nav-btn ${isActive ? "active" : ""}`}>
          <span className="nav-glyph">🌊</span>
          <span className="nav-caption">प्रवाह</span>
        </NavLink>

        <NavLink to="/smaran" className={({ isActive }) => `mobile-nav-btn ${isActive ? "active" : ""}`}>
          <span className="nav-glyph">🔖</span>
          <span className="nav-caption">स्मरण</span>
        </NavLink>

        <NavLink to={myProfilePath} className={({ isActive }) => `mobile-nav-btn ${isActive ? "active" : ""}`}>
          <span className="nav-glyph">🪪</span>
          <span className="nav-caption">परिचय</span>
        </NavLink>

        <NavLink to="/vyavastha" className={({ isActive }) => `mobile-nav-btn ${isActive ? "active" : ""}`}>
          <span className="nav-glyph">⚙️</span>
          <span className="nav-caption">व्यवस्था</span>
        </NavLink>
      </nav>
    </div>
  );
}
