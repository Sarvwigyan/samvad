# Samvad — Sovereign Anonymous Message Board (Phase 1)

Samvad is an anonymous, real-time message stream built with React (Vite) and Firebase Firestore.
Every visitor can post messages instantly visible to anyone worldwide without registration, login, usernames, or identifying profiles.

---

## 🛡️ 1. Firestore Security Rules (Mandatory)

The Firebase web config is public by design; the database is guarded **strictly** by server-side Firestore security rules.
Go to **Firebase Console → Firestore Database → Rules** and publish the following rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /messages/{id} {

      // Anyone can read — public stream
      allow read: if true;

      // Anyone can post, provided the document satisfies schema & constraints
      allow create: if
           request.resource.data.keys().hasOnly(
               ['text', 'createdAt', 'clientId'])
        && request.resource.data.text is string
        && request.resource.data.text.size() > 0
        && request.resource.data.text.size() <= 500
        && request.resource.data.clientId is string
        && request.resource.data.clientId.size() > 0
        && request.resource.data.createdAt == request.time;

      // Immutable posts: no edits or deletions allowed
      allow update, delete: if false;
    }
  }
}
```

> **Why `request.resource.data.createdAt == request.time`?**
> This ensures that clients cannot forge past or future timestamps to game feed ranking. It requires the client to supply `serverTimestamp()`.

---

## 🚀 2. Firebase Console Setup Guide

1. Navigate to [console.firebase.google.com](https://console.firebase.google.com/) and create a project (e.g., `samvad-app`).
2. **Database**: Click **Build → Firestore Database → Create database** (select Production mode, choose your nearest region).
3. **Rules**: Go to the **Rules** tab, paste the rules block above, and click **Publish**.
4. **Web App Credentials**:
   - Go to **Project Settings** (gear icon) → **General**.
   - Under *Your apps*, click the **Web (`</>`)** icon.
   - Register app (name: `Samvad Web`).
   - Copy the values into your local `.env` file (copied from `.env.example`).
5. **App Check (reCAPTCHA v3)**:
   - Click **Build → App Check → Apps**.
   - Select your Web app, click **Register** → **reCAPTCHA v3**.
   - Generate your Google reCAPTCHA v3 keys in Google Cloud / reCAPTCHA Console and add the Secret Key.
   - Copy the **reCAPTCHA Site Key** into `VITE_FB_RECAPTCHA_SITE_KEY`.
6. **Authentication**: Leave disabled for Phase 1.

---

## 💻 3. Local Development

1. Ensure Node.js (v18+) is installed on your machine.
2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
3. Fill in your Firebase config values in `.env`.
4. Install dependencies:
   ```bash
   npm install
   ```
5. Start local Vite development server:
   ```bash
   npm run dev
   ```
6. **App Check on Localhost**:
   - In development mode (`npm run dev`), open the browser console (F12).
   - You will see a debug token logged by Firebase:
     `Firebase App Check debug token: <TOKEN_UUID>`
   - Copy that token and add it in Firebase Console → **App Check → Apps → Manage debug tokens**.
   - This prevents App Check from rejecting localhost writes during testing.

---

## 🌐 4. Production Deployment (GitHub → Netlify)

1. **Commit and push repository**:
   ```bash
   git init
   git add .
   git commit -m "Phase 1: anonymous message board"
   git branch -M main
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Deploy on Netlify**:
   - Log into [Netlify](https://app.netlify.com/).
   - Click **Add new site → Import an existing project → GitHub**.
   - Pick your `samvad` repository.
   - Netlify will auto-detect settings from `netlify.toml`:
     - **Build command**: `npm run build`
     - **Publish directory**: `dist`
   - In **Site configuration → Environment variables**, add all variables from `.env`:
     - `VITE_FB_API_KEY`
     - `VITE_FB_AUTH_DOMAIN`
     - `VITE_FB_PROJECT_ID`
     - `VITE_FB_STORAGE_BUCKET`
     - `VITE_FB_MESSAGING_SENDER_ID`
     - `VITE_FB_APP_ID`
     - `VITE_FB_RECAPTCHA_SITE_KEY`
   - Click **Deploy site**.

3. **Whitelist Netlify Domain in Firebase**:
   - Once deployed, copy your Netlify domain (e.g. `your-app.netlify.app`).
   - Go to Firebase Console → **App Check** and reCAPTCHA admin console, add your Netlify domain to allowed domains.

---

## 📊 5. Free-Tier Quota Notes

- Firestore Free Tier gives:
  - **50,000 document reads/day**
  - **20,000 document writes/day**
  - **1 GiB storage**
- Real-time listeners bill 1 read per document delivered on initial load and 1 read per newly added document.
- The `limit(50)` query in `App.jsx` caps initial reads to 50 documents per session to protect quotas.