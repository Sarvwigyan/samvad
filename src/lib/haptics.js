/**
 * Sovereign Tactile Haptics Utility
 * Provides subtle tactile feedback on mobile devices mirroring
 * Duolingo and iOS native tactile interaction physics.
 */

export function triggerHaptic(duration = 10) {
  try {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(duration);
    }
  } catch (e) {
    // Graceful silent fallback if permission denied or unsupported
  }
}
