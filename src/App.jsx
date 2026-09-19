import React, { useEffect } from "react";
import { HashRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Layout } from "./components/Layout";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Followers from "./pages/Followers";
import Following from "./pages/Following";
import VicharDetail from "./pages/VicharDetail";
import Smaran from "./pages/Smaran";
import SettingsLayout from "./pages/Settings/SettingsLayout";
import { pruneIfNeeded } from "./lib/pruning";
import "./theme/tokens.css";
import "./theme/global.css";
import "./App.css";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    const centerCol = document.querySelector(".center-stream-col");
    if (centerCol) centerCol.scrollTop = 0;
  }, [pathname]);
  return null;
}

export default function App() {
  useEffect(() => {
    // Non-blocking auto-pruning evaluation after 30-second delay
    const timer = setTimeout(() => {
      pruneIfNeeded().catch(() => {});
    }, 30000);

    return () => clearTimeout(timer);
  }, []);
  return (
    <ThemeProvider>
      <AuthProvider>
        <HashRouter>
          <ScrollToTop />
          <Routes>
            <Route element={<Layout />}>
              {/* Home / Pravah Feed */}
              <Route path="/" element={<Home />} />

              {/* Individual Vichar Thread / Detail View */}
              <Route path="/vichar/:id" element={<VicharDetail />} />

              {/* Bookmarks / Smaran */}
              <Route path="/smaran" element={<Smaran />} />

              {/* Profile / Parichay */}
              <Route path="/parichay" element={<Profile />} />
              <Route path="/parichay/:uid" element={<Profile />} />
              <Route path="/parichay/:uid/anusari" element={<Followers />} />
              <Route path="/parichay/:uid/anusarit" element={<Following />} />

              {/* Settings / Vyavastha */}
              <Route path="/vyavastha" element={<SettingsLayout />} />

              {/* Catch-all fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </HashRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}