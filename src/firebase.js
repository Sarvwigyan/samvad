import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// Read Firebase Web configuration from Vite environment variables, with fallback to project defaults
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FB_API_KEY || "AIzaSyBLEFu4EL5NX0X0p7YjdqzZ8AgQCuOZfbg",
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN || "sarvwigyan-505103.firebaseapp.com",
  projectId: import.meta.env.VITE_FB_PROJECT_ID || "sarvwigyan-505103",
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET || "sarvwigyan-505103.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FB_MESSAGING_SENDER_ID || "812964260174",
  appId: import.meta.env.VITE_FB_APP_ID || "1:812964260174:web:b4e1a8bbbe6f7b92a7961f"
};

// Initialize the Firebase core app
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore using modular SDK v10
export const db = getFirestore(app);

// Initialize Firebase Authentication & Google Provider
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account"
});

// Setup Firebase App Check (reCAPTCHA v3) if key provided
const recaptchaSiteKey = import.meta.env.VITE_FB_RECAPTCHA_SITE_KEY;

if (typeof window !== "undefined" && recaptchaSiteKey) {
  if (import.meta.env.DEV) {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }

  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true
    });
  } catch (err) {
    console.warn("App Check initialization warning:", err);
  }
}
