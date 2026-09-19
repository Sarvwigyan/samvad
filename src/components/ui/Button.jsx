import React from "react";
import { triggerHaptic } from "../../lib/haptics";

/**
 * Tactile 3D Button Component
 * Incorporates Duolingo-style physical 3D push mechanics:
 * 4px chunky bottom shadow, snappy 40ms press, springy 150ms release,
 * and subtle mobile haptic feedback.
 */
export function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  onClick,
  type = "button",
  className = "",
  ariaLabel,
  ...props
}) {
  const handleClick = (e) => {
    if (disabled || loading) return;
    triggerHaptic(10);
    if (onClick) onClick(e);
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={handleClick}
      aria-label={ariaLabel}
      className={`btn-primitive btn-${variant} btn-${size} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="btn-spinner" aria-hidden="true" />
      ) : null}
      <span className="btn-content">{children}</span>
    </button>
  );
}
