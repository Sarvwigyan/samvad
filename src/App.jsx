import React, { useEffect, lazy, Suspense } from "react";
import { HashRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Layout } from "./components/Layout";
import { RouteLoadingFallback } from "./components/ui/RouteLoadingFallback";
import { TopProgressBar } from "./components/ui/TopProgressBar";
import { pruneIfNeeded } from "./lib/pruning";
import "./theme/tokens.css";
import "./theme/global.css";
import "./App.css";

// Lazy-loaded routes for lightning-fast initial load (YouTube & X style code splitting)
const Home = lazy(() => import("./pages/Home"));
const Profile = lazy(() => import("./pages/Profile"));
const Followers = lazy(() => import("./pages/Followers"));
const Following = lazy(() => import("./pages/Following"));
const VicharDetail = lazy(() => import("./pages/VicharDetail"));
const Smaran = lazy(() => import("./pages/Smaran"));
const SettingsLayout = lazy(() => import("./pages/Settings/SettingsLayout"));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    const centerCol = document.querySelector(".center-stream-col");
    if (centerCol) centerCol.scrollTop = 0;
  }, [pathname]);
  return null;
}

function NavigationWatcher() {
  const { pathname } = useLocation();
  const [navigating, setNavigating] = React.useState(false);

  useEffect(() => {
    setNavigating(true);
    const timer = setTimeout(() => setNavigating(false), 350);
    return () => clearTimeout(timer);
  }, [pathname]);

  if (!navigating) return null;
  return <TopProgressBar />;
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
          <NavigationWatcher />
          <Suspense fallback={<RouteLoadingFallback />}>
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
          </Suspense>
        </HashRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}