import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// Read Firebase Web configuration from Vite environment variables (prefixed with VITE_)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FB_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FB_APP_ID
};

// Initialize the Firebase core app
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore using modular SDK v10
export const db = getFirestore(app);

// Setup Firebase App Check (reCAPTCHA v3) to defend against bot spam
const recaptchaSiteKey = import.meta.env.VITE_FB_RECAPTCHA_SITE_KEY;

if (typeof window !== "undefined" && recaptchaSiteKey) {
  // In local development, self.FIREBASE_APPCHECK_DEBUG_TOKEN generates a debug token in
  // browser console. Registering this token in Firebase Console allows localhost testing
  // without being blocked by reCAPTCHA v3 enforcement.
  if (import.meta.env.DEV) {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }

  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(recaptchaSiteKey),
    isTokenAutoRefreshEnabled: true
  });
}
