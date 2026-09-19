import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Avatar } from "./ui/Avatar";
import { Button } from "./ui/Button";

export function Layout() {
  const { currentUser, userProfile, loginWithGoogle, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const myProfilePath = currentUser ? `/parichay/${currentUser.uid}` : "/";

  return (
    <div className="layout-shell">
      {/* Top Header */}
      <header className="site-header">
        <div className="header-inner">
          <div className="brand-crest-group" onClick={() => navigate("/")} role="button" tabIndex={0}>
            <div className="dharmachakra-icon" aria-hidden="true">
              ☸
            </div>
            <div className="brand-headings">
              <h1 className="brand-main-title">संवाद</h1>
              <span className="brand-sub-tag">SAMWAD • विचार-प्रवाह</span>
            </div>
          </div>

          <div className="header-controls">
            {/* Theme Toggler */}
            <button
              type="button"
              className="control-icon-btn"
              onClick={toggleTheme}
              title={theme === "dark" ? "प्रकाश मोड (Light Mode)" : "अन्धकार मोड (Dark Mode)"}
              aria-label="Toggle Theme"
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>

            {/* User Profile / Login */}
            {currentUser ? (
              <div className="user-dropdown-pill">
                <NavLink to={myProfilePath} className="user-pill-link">
                  <Avatar
                    src={userProfile?.avatarUrl || currentUser.photoURL}
                    alt={userProfile?.displayName || currentUser.displayName}
                    size="sm"
                    fallbackText={userProfile?.displayName || currentUser.displayName}
                  />
                  <span className="user-pill-name">
                    {userProfile?.displayName?.split(" ")[0] || "साधक"}
                  </span>
                </NavLink>
                <button
                  type="button"
                  className="logout-icon-btn"
                  onClick={logout}
                  title="बहिर्गम (Logout)"
                  aria-label="Logout"
                >
                  🚪
                </button>
              </div>
            ) : (
              <Button variant="primary" size="sm" onClick={loginWithGoogle}>
                प्रवेश (Login)
              </Button>
            )}
          </div>
        </div>

        {/* Shloka Ribbon */}
        <div className="shloka-ribbon-subtle">
          <span>✦ सत्यं वद • धर्मं चर • ज्ञानमेव जयते ✦</span>
        </div>
      </header>

      {/* Main Container */}
      <div className="layout-content-grid">
        {/* Navigation Sidebar (Desktop) */}
        <aside className="desktop-sidebar">
          <nav className="sidebar-nav">
            <NavLink
              to="/"
              className={({ isActive }) => `nav-link-item ${isActive ? "active" : ""}`}
            >
              <span className="nav-glyph">🌊</span>
              <div className="nav-labels">
                <span className="nav-primary">प्रवाह</span>
                <span className="nav-translit">Pravah (Feed)</span>
              </div>
            </NavLink>

            <NavLink
              to={myProfilePath}
              className={({ isActive }) => `nav-link-item ${isActive ? "active" : ""}`}
            >
              <span className="nav-glyph">👤</span>
              <div className="nav-labels">
                <span className="nav-primary">परिचय</span>
                <span className="nav-translit">Parichay (Profile)</span>
              </div>
            </NavLink>

            <NavLink
              to="/vyavastha"
              className={({ isActive }) => `nav-link-item ${isActive ? "active" : ""}`}
            >
              <span className="nav-glyph">⚙️</span>
              <div className="nav-labels">
                <span className="nav-primary">व्यवस्था</span>
                <span className="nav-translit">Vyavastha (Settings)</span>
              </div>
            </NavLink>
          </nav>
        </aside>

        {/* Center Content Viewport */}
        <main className="main-viewport">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav">
        <NavLink to="/" className={({ isActive }) => `mobile-nav-btn ${isActive ? "active" : ""}`}>
          <span className="nav-glyph">🌊</span>
          <span className="nav-caption">प्रवाह</span>
        </NavLink>

        <NavLink to={myProfilePath} className={({ isActive }) => `mobile-nav-btn ${isActive ? "active" : ""}`}>
          <span className="nav-glyph">👤</span>
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
