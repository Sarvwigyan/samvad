import React from "react";

export function Avatar({
  src,
  alt = "प्रयोक्ता",
  size = "md",
  className = "",
  fallbackText
}) {
  const [imgError, setImgError] = React.useState(!src);

  React.useEffect(() => {
    setImgError(!src);
  }, [src]);

  return (
    <div className={`avatar-container avatar-${size} ${className}`}>
      {src && !imgError ? (
        <img
          src={src}
          alt={alt}
          className="avatar-img"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="avatar-fallback" aria-hidden="true">
          {fallbackText ? fallbackText.slice(0, 2).toUpperCase() : "🪷"}
        </div>
      )}
    </div>
  );
}
