import React, { useState, useEffect } from "react";
import { Modal } from "../components/ui/Modal";
import { Input, Textarea } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { validateUsername, validateBio } from "../lib/validation";
import { upsertUserProfile } from "../lib/firestore";
import { uploadUserAvatar, uploadUserBanner } from "../lib/storage";
import { CameraIcon } from "../components/ui/Icons";

export function EditProfile({ isOpen, onClose, profile, onSaved }) {
  const [displayName, setDisplayName] = useState(profile?.displayName || "");
  const [username, setUsername] = useState(profile?.username || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [location, setLocation] = useState(profile?.location || "");
  const [website, setWebsite] = useState(profile?.website || "");

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatarUrl || "");
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(profile?.bannerUrl || "");

  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Revoke object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
      if (bannerPreview && bannerPreview.startsWith("blob:")) {
        URL.revokeObjectURL(bannerPreview);
      }
    };
  }, [avatarPreview, bannerPreview]);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleBannerChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!displayName.trim()) {
      newErrors.displayName = "नाम अनिवार्य है";
    }

    const userVal = validateUsername(username);
    if (!userVal.valid) {
      newErrors.username = userVal.error;
    }

    const bioVal = validateBio(bio);
    if (!bioVal.valid) {
      newErrors.bio = bioVal.error;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSaving(true);
    setErrors({});

    try {
      let finalAvatarUrl = profile?.avatarUrl || null;
      let finalBannerUrl = profile?.bannerUrl || null;

      if (avatarFile) {
        finalAvatarUrl = await uploadUserAvatar(profile.uid, avatarFile);
      }
      if (bannerFile) {
        finalBannerUrl = await uploadUserBanner(profile.uid, bannerFile);
      }

      const updated = await upsertUserProfile(profile.uid, {
        displayName: displayName.trim(),
        username: userVal.sanitized,
        bio: bioVal.sanitized,
        location: location.trim(),
        website: website.trim(),
        avatarUrl: finalAvatarUrl,
        bannerUrl: finalBannerUrl
      });

      if (onSaved) onSaved(updated);
      onClose();
    } catch (err) {
      console.error("Profile save error:", err);
      setErrors({ form: "प्रोफ़ाइल सहेजने में त्रुटि आई। कृपया पुनः प्रयास करें।" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="परिचय संशोधन (Edit Profile)">
      <form onSubmit={handleSave} className="edit-profile-form">
        {errors.form && <p className="form-error-banner">{errors.form}</p>}

        {/* Banner Preview & Input */}
        <div className="banner-edit-container">
          <label className="image-upload-label">बैनर चित्र</label>
          <div className="banner-preview-box">
            {bannerPreview ? (
              <img src={bannerPreview} alt="बैनर पूर्वावलोकन" className="banner-preview-img" />
            ) : (
              <div className="banner-fallback" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleBannerChange}
              className="file-input-hidden"
              id="banner-upload"
            />
            <label htmlFor="banner-upload" className="file-pick-overlay" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <CameraIcon size={16} /> बैनर बदलें
            </label>
          </div>
        </div>

        {/* Avatar Preview & Input */}
        <div className="avatar-edit-container">
          <label className="image-upload-label">अवतार चित्र</label>
          <div className="avatar-preview-box">
            {avatarPreview ? (
              <img src={avatarPreview} alt="अवतार पूर्वावलोकन" className="avatar-preview-img" />
            ) : (
              <div className="avatar-fallback">☸</div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="file-input-hidden"
              id="avatar-upload"
            />
            <label htmlFor="avatar-upload" className="file-pick-overlay" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CameraIcon size={18} />
            </label>
          </div>
        </div>

        <Input
          id="displayName"
          label="नाम (Display Name)"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={50}
          error={errors.displayName}
          required
        />

        <Input
          id="username"
          label="प्रयोक्ता-नाम (@username)"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          maxLength={20}
          error={errors.username}
          helperText="केवल छोटे अक्षर (a-z), अंक और _ मान्य हैं"
          required
        />

        <Textarea
          id="bio"
          label="परिचय-विवरण (Bio)"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={160}
          rows={3}
          error={errors.bio}
          helperText={`${bio.length} / 160`}
        />

        <Input
          id="location"
          label="स्थान (Location)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          maxLength={50}
          placeholder="उदा. काशी, भारत"
        />

        <Input
          id="website"
          label="जालस्थल (Website)"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          maxLength={100}
          placeholder="https://example.com"
        />

        <div className="modal-actions-row">
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            रद्द करें (Cancel)
          </Button>
          <Button type="submit" variant="primary" loading={isSaving}>
            सहेजें (Save)
          </Button>
        </div>
      </form>
    </Modal>
  );
}
