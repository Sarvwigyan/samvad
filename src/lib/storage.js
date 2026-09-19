import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";

/**
 * Uploads an avatar image file to Firebase Storage under avatars/{uid}
 * @param {string} uid - User ID
 * @param {File} file - Image file
 * @returns {Promise<string>} Download URL
 */
export async function uploadUserAvatar(uid, file) {
  if (!uid || !file) throw new Error("प्रयोक्ता पहचान या संचिका अनुपस्थित है");
  const ext = file.name.split(".").pop() || "jpg";
  const storageRef = ref(storage, `avatars/${uid}.${ext}`);
  const snapshot = await uploadBytes(storageRef, file, {
    contentType: file.type || "image/jpeg"
  });
  return await getDownloadURL(snapshot.ref);
}

/**
 * Uploads a banner image file to Firebase Storage under banners/{uid}
 * @param {string} uid - User ID
 * @param {File} file - Image file
 * @returns {Promise<string>} Download URL
 */
export async function uploadUserBanner(uid, file) {
  if (!uid || !file) throw new Error("प्रयोक्ता पहचान या संचिका अनुपस्थित है");
  const ext = file.name.split(".").pop() || "jpg";
  const storageRef = ref(storage, `banners/${uid}.${ext}`);
  const snapshot = await uploadBytes(storageRef, file, {
    contentType: file.type || "image/jpeg"
  });
  return await getDownloadURL(snapshot.ref);
}
