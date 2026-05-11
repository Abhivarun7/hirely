/**
 * Lightweight notification chime using the Web Audio API. We synthesize a
 * short two-tone ding so we don't need to ship an audio asset, and so it
 * works offline.
 *
 * The browser blocks autoplay until the user has interacted with the page.
 * Calling play() is safe before that — we just no-op silently.
 */

let ctx: AudioContext | null = null;
let lastPlayedAt = 0;
const MIN_INTERVAL_MS = 800;

function getCtx(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor =
    (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    ctx = null;
  }
  return ctx;
}

function tone(audio: AudioContext, frequency: number, startAt: number, duration: number, gain = 0.08) {
  const osc = audio.createOscillator();
  const env = audio.createGain();
  osc.type = 'sine';
  osc.frequency.value = frequency;
  env.gain.setValueAtTime(0, startAt);
  env.gain.linearRampToValueAtTime(gain, startAt + 0.01);
  env.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(env).connect(audio.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.02);
}

export function playNotificationSound(): void {
  const now = Date.now();
  if (now - lastPlayedAt < MIN_INTERVAL_MS) return;
  lastPlayedAt = now;

  const audio = getCtx();
  if (!audio) return;
  if (audio.state === 'suspended') {
    audio.resume().catch(() => {});
  }
  const t0 = audio.currentTime + 0.01;
  tone(audio, 880, t0, 0.12);
  tone(audio, 1320, t0 + 0.09, 0.16);
}
