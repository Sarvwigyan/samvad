# संवाद (Samwad) — भारतीय विचार-प्रवाह (Phase 2: Vedic Overhaul & Google Auth)

संवाद (Samwad) एक सम्प्रभु, भारतीय व संस्कृत शैली से ओत-प्रोत विचार-मंच है।
यहाँ कोई भी पाठक विचारों का अवलोकन कर सकता है, तथा केवल **गूगल से प्रमाणित प्रयोक्ता (Google Verified Users)** ही अपने विचार प्रेषित कर सकते हैं — चाहे अपनी प्रत्यक्ष पहचान से अथवा गुप्त साधक के रूप में।

---

## 🛡️ 1. Firestore Security Rules (अद्यतन सुरक्षा नियम)

Firebase Console → **Firestore Database → Rules** में जाकर इन नियमों को **Publish** करें:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /messages/{id} {

      // Any visitor can read the feed
      allow read: if true;

      // Only Google authenticated users can post
      allow create: if
           request.auth != null
        && request.resource.data.keys().hasOnly(
               ['text', 'createdAt', 'clientId', 'bhav', 'authorName', 'authorPhoto', 'isAnonymous', 'uid'])
        && request.resource.data.text is string
        && request.resource.data.text.size() > 0
        && request.resource.data.text.size() <= 500
        && request.resource.data.uid == request.auth.uid
        && request.resource.data.createdAt == request.time;

      // Immutable: No edits or deletions
      allow update, delete: if false;
    }
  }
}
```

---

## 🔑 2. Firebase Console: Enable Google Sign-In

1. [Firebase Console](https://console.firebase.google.com/) में जाएँ।
2. Left menu में **Build** (या **Security**) → **Authentication** पर क्लिक करें।
3. **Sign-in method** tab में जाएँ।
4. **Google** provider पर क्लिक करें → **Enable** करें।
5. Project public-facing name और support email चुनें और **Save** कर दें।
6. **Authorized domains** में सुनिश्चित करें कि ये डोमेन जोड़े गए हैं:
   - `localhost`
   - `samwad.netlify.app`
   - `sarvwigyan.github.io`

---

## 💻 3. Local Development

```bash
cd c:\Users\dviwe\OneDrive\Documents\Dviwedi\COMPUTATION\samvad
dev.bat
```
Visit: `http://localhost:5173/`

---

## 🌐 4. Production Deployment

- **Netlify**: GitHub repo से कनेक्टेड है (`samwad.netlify.app`), प्रत्येक `git push` पर स्वतः बिल्ड व डिप्लॉय हो जाता है।
- **GitHub Pages**: `vite.config.js` में `base: './'` सेट किया गया है, जिससे `https://sarvwigyan.github.io/samvad/` पर भी बिना वाइट-स्क्रीन एरर के सम्पूर्ण एसेट्स लोड होते हैं।

---

## ⏳ 5. Firestore TTL Policy (Auto-Pruning Setup)

Firestore में स्वचालित 90-दिवसीय विलोपन (TTL) सक्रिय करने हेतु:
1. [Firebase Console](https://console.firebase.google.com/) → **Firestore Database** में जाएँ।
2. **Time-to-live (TTL)** टैब चुनें।
3. **Create Policy** पर क्लिक करें:
   - **Collection group**: `posts`
   - **Timestamp field**: `expireAt`
4. **Create** करें। Google के सर्वर `expireAt` बीतने के 24 घंटे के भीतर पुराने अप्रज़र्व्ड विचारों को स्वतः शून्य लागत पर हटाते रहेंगे।
5. *ध्यान दें*: जब कोई विचार मूल्यवान (Immortal) बन जाता है (10+ एंगेजमेंट, बुकमार्क आदि), संवाद कोड स्वतः उसके `expireAt` को वर्ष **2099** पर सेट कर देता है, जिससे वह कभी नष्ट नहीं होता।