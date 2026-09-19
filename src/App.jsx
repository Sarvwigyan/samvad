import React from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
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
import "./theme/tokens.css";
import "./theme/global.css";
import "./App.css";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <HashRouter>
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