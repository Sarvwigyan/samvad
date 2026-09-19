import React from "react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Button } from "../../components/ui/Button";

export default function SettingsLayout() {
  const { currentUser, userProfile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="settings-page-shell">
      <header className="settings-header">
        <h2 className="settings-title">व्यवस्था (Settings)</h2>
        <p className="settings-desc">अपनी प्राथमिकताएँ, रूप-रंग और गोपनीयता प्रबंधित करें।</p>
      </header>

      <div className="settings-section-list">
        {/* Appearance */}
        <div className="settings-card">
          <div className="settings-card-header">
            <h4>🎨 रूप-रंग (Appearance)</h4>
            <p>प्रकाश अथवा अन्धकार पृष्ठभूमि का चयन करें।</p>
          </div>
          <div className="settings-card-content">
            <Button variant="outline" size="sm" onClick={toggleTheme}>
              वर्तमान: {theme === "dark" ? "अन्धकार (Dark Mode)" : "प्रकाश (Light Mode)"} — बदलें
            </Button>
          </div>
        </div>

        {/* Account Info */}
        <div className="settings-card">
          <div className="settings-card-header">
            <h4>🪪 अभिलेख (Account)</h4>
            <p>आपका पंजीकृत खाता और परिचय जानकारी।</p>
          </div>
          <div className="settings-card-content">
            <p className="setting-info-row">
              <strong>ईमेल:</strong> {currentUser?.email || "अज्ञात"}
            </p>
            <p className="setting-info-row">
              <strong>प्रयोक्ता-नाम:</strong> @{userProfile?.username || "sadharak"}
            </p>
            <p className="setting-info-row">
              <strong>स्थिति:</strong> {userProfile?.verified ? "सत्यापित साधक" : "सक्रिय"}
            </p>
          </div>
        </div>

        {/* Privacy & Ahimsa Skeleton */}
        <div className="settings-card">
          <div className="settings-card-header">
            <h4>🛡️ गोपनीयता व मर्यादा (Privacy & Ethics)</h4>
            <p>अहिंसा फ़िल्टर स्तर और सामग्री मर्यादा (Phase 5/6 में विस्तृत)।</p>
          </div>
          <div className="settings-card-content">
            <span className="stub-pill">मर्यादा: सौम्य (Moderate)</span>
            <span className="stub-pill">गोपनीयता: सार्वजनिक (Public)</span>
          </div>
        </div>

        {/* Logout */}
        {currentUser && (
          <div className="settings-card logout-card">
            <div className="settings-card-header">
              <h4>🚪 बहिर्गम (Sign Out)</h4>
              <p>इस उपकरण से अपने सत्र को समाप्त करें।</p>
            </div>
            <Button variant="ghost" size="sm" onClick={logout} className="btn-danger-tone">
              सत्र समाप्त करें (Logout)
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
