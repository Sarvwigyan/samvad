/**
 * Synthesizes a resonant Vedic temple bell (घंटा नाद) acoustic using the Web Audio API.
 * Uses harmonic partials (fundamental, minor third, fifth, octave, and shimmering overtone)
 * with natural exponential damping. Completely synthetic — requires zero external assets.
 */
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx && typeof window !== "undefined") {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playTempleChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Harmonic frequencies simulating a traditional Indian temple brass bell
    const baseFreq = 587.33; // Note D5 (Savitr / Shankh resonance)
    const partials = [
      { ratio: 1.0, gain: 0.35, decay: 2.8 },
      { ratio: 1.5, gain: 0.22, decay: 2.2 },
      { ratio: 2.0, gain: 0.18, decay: 1.6 },
      { ratio: 2.76, gain: 0.12, decay: 1.2 },
      { ratio: 3.42, gain: 0.08, decay: 0.9 },
      { ratio: 4.15, gain: 0.04, decay: 0.6 }
    ];

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.7, now);
    masterGain.connect(ctx.destination);

    partials.forEach(({ ratio, gain, decay }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(baseFreq * ratio, now);

      // Attack and natural exponential decay
      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.exponentialRampToValueAtTime(gain, now + 0.012);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + decay);

      osc.connect(gainNode);
      gainNode.connect(masterGain);

      osc.start(now);
      osc.stop(now + decay);
    });
  } catch (err) {
    console.debug("Audio chime skipped:", err);
  }
}
