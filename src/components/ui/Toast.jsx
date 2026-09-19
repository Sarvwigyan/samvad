import React from "react";

export function Toast({ message, type = "info", onClose }) {
  if (!message) return null;
  return (
    <div className={`toast-notification toast-${type}`} role="alert">
      <span className="toast-icon">
        {type === "error" ? "⚠️" : type === "success" ? "✓" : "ℹ️"}
      </span>
      <span className="toast-text">{message}</span>
      {onClose && (
        <button
          type="button"
          className="toast-close"
          onClick={onClose}
          aria-label="सूचना हटाएँ"
        >
          ×
        </button>
      )}
    </div>
  );
}
