import React, { useEffect, useState } from "react";

/**
 * YouTube-style Glowing Nano Loading Bar
 * Slides smoothly across the top of the screen during route transitions or data loading.
 */
export function TopProgressBar() {
  const [progress, setProgress] = useState(25);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer1 = setTimeout(() => setProgress(75), 60);
    const timer2 = setTimeout(() => setProgress(100), 240);
    const timer3 = setTimeout(() => setVisible(false), 460);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="top-nano-progress-wrap" aria-hidden="true">
      <div className="top-nano-progress-bar" style={{ width: `${progress}%` }} />
    </div>
  );
}
