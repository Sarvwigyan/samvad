import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db, googleProvider } from "../firebase";
import { upsertUserProfile } from "../lib/firestore";

const AuthContext = createContext(null);

const CACHED_USER_KEY = "samwad_cached_user";
const CACHED_PROFILE_KEY = "samwad_cached_profile";

export function AuthProvider({ children }) {
  // Synchronous cache hydration for instant, 0ms session restoration (No guest flicker)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem(CACHED_USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [userProfile, setUserProfile] = useState(() => {
    try {
      const saved = localStorage.getItem(CACHED_PROFILE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const minimalUser = {
          uid: user.uid,
          displayName: user.displayName,
          photoURL: user.photoURL,
          email: user.email
        };
        setCurrentUser(user);
        try {
          localStorage.setItem(CACHED_USER_KEY, JSON.stringify(minimalUser));
        } catch (e) {}

        // Real-time listener on the user's profile document
        const userRef = doc(db, "users", user.uid);
        unsubscribeProfile = onSnapshot(
          userRef,
          async (docSnap) => {
            if (docSnap.exists()) {
              const prof = { uid: user.uid, ...docSnap.data() };
              setUserProfile(prof);
              try {
                localStorage.setItem(CACHED_PROFILE_KEY, JSON.stringify(prof));
              } catch (e) {}
            } else {
              // Initial profile synthesis if doc doesn't exist
              try {
                const newProfile = await upsertUserProfile(user.uid, {
                  displayName: user.displayName || "सुधी साधक",
                  avatarUrl: user.photoURL || null,
                  username: (user.email ? user.email.split("@")[0].replace(/[^a-z0-9_]/gi, "") : `user_${user.uid.slice(0, 5)}`).toLowerCase()
                });
                setUserProfile(newProfile);
                try {
                  localStorage.setItem(CACHED_PROFILE_KEY, JSON.stringify(newProfile));
                } catch (e) {}
              } catch (err) {
                // If permission denied, construct fallback profile in state
                const fallback = {
                  uid: user.uid,
                  displayName: user.displayName || "सुधी साधक",
                  avatarUrl: user.photoURL || null,
                  username: (user.email ? user.email.split("@")[0].replace(/[^a-z0-9_]/gi, "") : `user_${user.uid.slice(0, 5)}`).toLowerCase()
                };
                setUserProfile(fallback);
              }
            }
            setLoading(false);
          },
          (err) => {
            console.warn("User profile snapshot notice:", err.message);
            setLoading(false);
          }
        );
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        try {
          localStorage.removeItem(CACHED_USER_KEY);
          localStorage.removeItem(CACHED_PROFILE_KEY);
        } catch (e) {}
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const loginWithGoogle = async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      return res.user;
    } catch (err) {
      console.error("Google login error:", err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setUserProfile(null);
      localStorage.removeItem(CACHED_USER_KEY);
      localStorage.removeItem(CACHED_PROFILE_KEY);
    } catch (err) {
      console.error("Logout error:", err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        loginWithGoogle,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
