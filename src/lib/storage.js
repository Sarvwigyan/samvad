import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";

/**
 * Client-side image compression and resizing using HTML5 Canvas.
 * Dramatically reduces 5-10MB mobile/desktop camera photos to ~40-60KB.
 *
 * @param {File|Blob} file - Original file
 * @param {number} maxWidth - Max width in pixels
 * @param {number} maxHeight - Max height in pixels
 * @param {number} quality - JPEG compression quality (0.0 to 1.0)
 * @returns {Promise<{ blob: Blob, dataUrl: string }>}
 */
export async function compressAndResizeImage(file, maxWidth = 600, maxHeight = 600, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error("संचिका अनुपस्थित है"));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("संचिका पढ़ने में असमर्थ"));
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onerror = () => reject(new Error("चित्र लोड करने में असमर्थ"));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return reject(new Error("Canvas संदर्भ प्राप्त नहीं हुआ"));
        }

        // Smooth bicubic downsampling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ blob, dataUrl });
            } else {
              resolve({ blob: file, dataUrl });
            }
          },
          "image/jpeg",
          quality
        );
      };
      img.src = readerEvent.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads with strict timeout to prevent infinite loading.
 * Falls back to compressed base64 data URI if storage rejects or times out.
 */
async function uploadWithTimeoutAndFallback(storagePath, file, maxWidth, maxHeight, timeoutMs = 7000) {
  let compressed;
  try {
    compressed = await compressAndResizeImage(file, maxWidth, maxHeight, 0.85);
  } catch (e) {
    console.warn("Compression warning, using raw file:", e);
    compressed = { blob: file, dataUrl: null };
  }

  // Attempt Firebase Cloud Storage upload with timeout
  const uploadPromise = async () => {
    const storageRef = ref(storage, storagePath);
    const snapshot = await uploadBytes(storageRef, compressed.blob, {
      contentType: "image/jpeg"
    });
    return await getDownloadURL(snapshot.ref);
  };

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("STORAGE_TIMEOUT")), timeoutMs)
  );

  try {
    return await Promise.race([uploadPromise(), timeoutPromise]);
  } catch (err) {
    console.warn("Storage upload notice (timeout/rules), using resilient base64 fallback:", err?.message);
    if (compressed.dataUrl) {
      return compressed.dataUrl;
    }
    throw err;
  }
}

/**
 * Uploads avatar image (max 400x400) under avatars/{uid}
 * @param {string} uid - User ID
 * @param {File} file - Image file
 * @returns {Promise<string>} Download URL or optimized base64 Data URL
 */
export async function uploadUserAvatar(uid, file) {
  if (!uid || !file) throw new Error("प्रयोक्ता पहचान या संचिका अनुपस्थित है");
  return uploadWithTimeoutAndFallback(`avatars/${uid}.jpg`, file, 400, 400, 6000);
}

/**
 * Uploads banner image (max 1200x400) under banners/{uid}
 * @param {string} uid - User ID
 * @param {File} file - Image file
 * @returns {Promise<string>} Download URL or optimized base64 Data URL
 */
export async function uploadUserBanner(uid, file) {
  if (!uid || !file) throw new Error("प्रयोक्ता पहचान या संचिका अनुपस्थित है");
  return uploadWithTimeoutAndFallback(`banners/${uid}.jpg`, file, 1200, 450, 7000);
}
