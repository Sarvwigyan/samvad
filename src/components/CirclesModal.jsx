import React, { useState } from "react";
import { CloseIcon, PlusIcon, TrashIcon, UsersIcon } from "./ui/Icons";
import { Button } from "./ui/Button";
import { createCircle, deleteCircle, addMemberToCircle, removeMemberFromCircle } from "../lib/circles";
import { searchUsersByMention } from "../lib/mentions";
import { Avatar } from "./ui/Avatar";
import { triggerHaptic } from "../lib/haptics";

const EMOJI_ICONS = ["🪷", "🏛️", "⚡", "📖", "🧘", "🌿", "🕉️", "📜", "🏹", "🛡️"];

export function CirclesModal({ isOpen, onClose, circles, onCirclesUpdated, currentUserId }) {
  const [activeTab, setActiveTab] = useState("list"); // 'list' | 'create'
  const [selectedCircle, setSelectedCircle] = useState(null);
  
  // New Circle Form
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [icon, setIcon] = useState("🪷");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Member management
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  if (!isOpen) return null;

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    triggerHaptic(15);
    try {
      await createCircle(currentUserId, {
        name: name.trim(),
        description: desc.trim(),
        icon,
        memberUids: []
      });
      setName("");
      setDesc("");
      setActiveTab("list");
      if (onCirclesUpdated) onCirclesUpdated();
    } catch (err) {
      console.error("Circle creation error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (circleId, e) => {
    e.stopPropagation();
    if (window.confirm("क्या आप इस मण्डल को हटाना चाहते हैं?")) {
      triggerHaptic(15);
      await deleteCircle(currentUserId, circleId);
      if (selectedCircle?.id === circleId) setSelectedCircle(null);
      if (onCirclesUpdated) onCirclesUpdated();
    }
  };

  const handleSearchUser = async (val) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      return;
    }
    const results = await searchUsersByMention(val.trim(), 5);
    setSearchResults(results);
  };

  const handleAddMember = async (memberUid) => {
    if (!selectedCircle) return;
    triggerHaptic(10);
    await addMemberToCircle(currentUserId, selectedCircle.id, memberUid);
    setSelectedCircle((prev) => ({
      ...prev,
      memberUids: Array.from(new Set([...(prev.memberUids || []), memberUid]))
    }));
    setSearchQuery("");
    setSearchResults([]);
    if (onCirclesUpdated) onCirclesUpdated();
  };

  const handleRemoveMember = async (memberUid) => {
    if (!selectedCircle) return;
    triggerHaptic(10);
    await removeMemberFromCircle(currentUserId, selectedCircle.id, memberUid);
    setSelectedCircle((prev) => ({
      ...prev,
      memberUids: (prev.memberUids || []).filter((id) => id !== memberUid)
    }));
    if (onCirclesUpdated) onCirclesUpdated();
  };

  return (
    <div className="circles-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="circles-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="circles-modal-header">
          <div className="circles-modal-title-row">
            <span className="circles-title-glyph">⭕</span>
            <h3>साधक मण्डल (Circles & Lists)</h3>
          </div>
          <button type="button" className="circles-close-btn" onClick={onClose} aria-label="बंद करें">
            <CloseIcon size={18} />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="circles-nav-tabs">
          <button
            type="button"
            className={`circles-nav-tab ${activeTab === "list" ? "active" : ""}`}
            onClick={() => { setActiveTab("list"); setSelectedCircle(null); }}
          >
            मेरे मण्डल ({circles.length})
          </button>
          <button
            type="button"
            className={`circles-nav-tab ${activeTab === "create" ? "active" : ""}`}
            onClick={() => setActiveTab("create")}
          >
            + नया मण्डल बनाएँ
          </button>
        </div>

        <div className="circles-modal-body">
          {activeTab === "create" ? (
            <form onSubmit={handleCreate} className="circle-create-form">
              <div className="form-field-group">
                <label>मण्डल का नाम *</label>
                <input
                  type="text"
                  placeholder="उदा: वेदान्त अनुसन्धान, खगोल विज्ञान..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={40}
                  required
                  className="circle-form-input"
                />
              </div>

              <div className="form-field-group">
                <label>विवरण (वैकल्पिक)</label>
                <textarea
                  placeholder="इस मण्डल का उद्देश्य अथवा विषय..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  maxLength={160}
                  className="circle-form-textarea"
                />
              </div>

              <div className="form-field-group">
                <label>प्रतीक चिह्न (Icon)</label>
                <div className="emoji-picker-row">
                  {EMOJI_ICONS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      className={`emoji-choice-btn ${icon === em ? "selected" : ""}`}
                      onClick={() => setIcon(em)}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              <div className="circle-form-actions">
                <Button type="submit" variant="primary" size="md" loading={isSubmitting}>
                  मण्डल स्थापित करें (Create Circle)
                </Button>
              </div>
            </form>
          ) : selectedCircle ? (
            /* Circle Detail / Member Management */
            <div className="circle-detail-view">
              <button
                type="button"
                className="circle-back-btn"
                onClick={() => setSelectedCircle(null)}
              >
                ← सभी मण्डल
              </button>

              <div className="circle-detail-header">
                <span className="circle-detail-icon">{selectedCircle.icon || "⭕"}</span>
                <div>
                  <h4 className="circle-detail-name">{selectedCircle.name}</h4>
                  <p className="circle-detail-desc">{selectedCircle.description || "कोई विवरण नहीं"}</p>
                </div>
              </div>

              <div className="circle-members-section">
                <h5>सदस्य साधक ({(selectedCircle.memberUids || []).length})</h5>
                
                {/* Add member search */}
                <div className="circle-member-search-box">
                  <input
                    type="text"
                    placeholder="साधक खोजें एवं मण्डल में जोड़ें (@handle)..."
                    value={searchQuery}
                    onChange={(e) => handleSearchUser(e.target.value)}
                    className="circle-member-search-input"
                  />
                  {searchResults.length > 0 && (
                    <div className="circle-search-dropdown">
                      {searchResults.map((u) => (
                        <div key={u.uid} className="circle-search-item" onClick={() => handleAddMember(u.uid)}>
                          <Avatar src={u.avatarUrl} alt={u.displayName} size="xs" fallbackText={u.displayName} />
                          <span className="search-name">{u.displayName} (@{u.username})</span>
                          <span className="search-add-badge">+ जोड़ें</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Member list */}
                <div className="circle-member-list">
                  {(selectedCircle.memberUids || []).length === 0 ? (
                    <p className="no-members-msg">इस मण्डल में अभी कोई साधक नहीं है। ऊपर खोजकर जोड़ें।</p>
                  ) : (
                    selectedCircle.memberUids.map((uid) => (
                      <div key={uid} className="circle-member-chip">
                        <span>@{uid.slice(0, 14)}</span>
                        <button
                          type="button"
                          className="remove-member-btn"
                          onClick={() => handleRemoveMember(uid)}
                          title="मण्डल से हटाएँ"
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Circle List */
            <div className="circles-list-view">
              {circles.map((c) => (
                <div
                  key={c.id}
                  className="circle-card-item"
                  onClick={() => setSelectedCircle(c)}
                >
                  <span className="circle-card-icon">{c.icon || "⭕"}</span>
                  <div className="circle-card-meta">
                    <div className="circle-card-title-row">
                      <h4 className="circle-card-name">{c.name}</h4>
                      {c.isDefault && <span className="default-circle-pill">संवाद प्रमाणित</span>}
                    </div>
                    {c.description && <p className="circle-card-desc">{c.description}</p>}
                    <span className="circle-card-count">
                      <UsersIcon size={13} /> {(c.memberUids || []).length} साधक
                    </span>
                  </div>

                  {!c.isDefault && (
                    <button
                      type="button"
                      className="circle-delete-btn"
                      onClick={(e) => handleDelete(c.id, e)}
                      title="मण्डल हटाएँ"
                    >
                      <TrashIcon size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
