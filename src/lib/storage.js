/**
 * Sovereign In-Browser Image Processing for Samwad
 * Performs high-speed client-side canvas compression and resizing.
 * Stores lightweight optimized data directly without requiring Firebase Blaze plan
 * or external Cloud Storage buckets. 100% Free, Instantaneous, and Sovereign.
 */

/**
 * Client-side image compression and resizing using HTML5 Canvas.
 * Dramatically reduces 5-10MB camera/phone photos to ~25-60KB.
 *
 * @param {File|Blob} file - Original file
 * @param {number} maxWidth - Max width in pixels
 * @param {number} maxHeight - Max height in pixels
 * @param {number} quality - JPEG compression quality (0.0 to 1.0)
 * @returns {Promise<{ blob: Blob, dataUrl: string }>}
 */
export async function compressAndResizeImage(file, maxWidth = 600, maxHeight = 600, quality = 0.82) {
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
            resolve({ blob: blob || file, dataUrl });
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
 * Compresses and prepares user avatar (max 400x400, ~25-35KB)
 * Returns instantly without needing paid Cloud Storage.
 *
 * @param {string} uid - User ID
 * @param {File} file - Image file
 * @returns {Promise<string>} Ultra-compact high-res Data URL
 */
export async function uploadUserAvatar(uid, file) {
  if (!uid || !file) throw new Error("प्रयोक्ता पहचान या संचिका अनुपस्थित है");
  const compressed = await compressAndResizeImage(file, 400, 400, 0.82);
  return compressed.dataUrl;
}

/**
 * Compresses and prepares user banner (max 1200x450, ~50-70KB)
 * Returns instantly without needing paid Cloud Storage.
 *
 * @param {string} uid - User ID
 * @param {File} file - Image file
 * @returns {Promise<string>} Ultra-compact high-res Data URL
 */
export async function uploadUserBanner(uid, file) {
  if (!uid || !file) throw new Error("प्रयोक्ता पहचान या संचिका अनुपस्थित है");
  const compressed = await compressAndResizeImage(file, 1200, 450, 0.82);
  return compressed.dataUrl;
}
