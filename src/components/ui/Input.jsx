import React from "react";

export function Input({
  label,
  error,
  helperText,
  id,
  className = "",
  ...props
}) {
  return (
    <div className={`input-field-group ${className}`}>
      {label && (
        <label htmlFor={id} className="input-label">
          {label}
        </label>
      )}
      <input id={id} className={`input-primitive ${error ? "input-error" : ""}`} {...props} />
      {error ? (
        <span className="input-feedback error">{error}</span>
      ) : helperText ? (
        <span className="input-feedback helper">{helperText}</span>
      ) : null}
    </div>
  );
}

export function Textarea({
  label,
  error,
  helperText,
  id,
  className = "",
  ...props
}) {
  return (
    <div className={`input-field-group ${className}`}>
      {label && (
        <label htmlFor={id} className="input-label">
          {label}
        </label>
      )}
      <textarea id={id} className={`textarea-primitive ${error ? "input-error" : ""}`} {...props} />
      {error ? (
        <span className="input-feedback error">{error}</span>
      ) : helperText ? (
        <span className="input-feedback helper">{helperText}</span>
      ) : null}
    </div>
  );
}
