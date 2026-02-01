/**
 * Play a short bell/notification sound for reminders.
 * Uses Web Audio API so no asset is required. Throttled to avoid overlap.
 */

const THROTTLE_MS = 2500;
let lastPlayedAt = 0;

export function playReminderBell() {
  const now = Date.now();
  if (now - lastPlayedAt < THROTTLE_MS) return;
  lastPlayedAt = now;

  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.setValueAtTime(600, ctx.currentTime + 0.08);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.16);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch (_) {
    // Ignore if AudioContext not supported or autoplay blocked
  }
}
