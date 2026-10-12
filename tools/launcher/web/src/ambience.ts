const LEVEL = 0.3;
const FADE_STEP_MS = 90;

let audio: HTMLAudioElement | null = null;
let fadeTimer: number | null = null;
let playing = false;
let wanted = false;

function ensureAudio(): HTMLAudioElement | null {
  if (audio !== null) return audio;
  audio = new Audio("/ambience.wav");
  audio.loop = true;
  audio.preload = "auto";
  audio.volume = 0;
  return audio;
}

export function isSupported(): boolean {
  return typeof window !== "undefined" && typeof window.Audio !== "undefined";
}

export function isPlaying(): boolean {
  return playing;
}

export function unlock(): void {
  const element = ensureAudio();
  if (!element) return;
  const attempt = element.play();
  if (attempt !== undefined) attempt.catch(() => undefined);
  element.pause();
}

function fade(to: number): void {
  const element = ensureAudio();
  if (!element) return;
  if (fadeTimer !== null) {
    window.clearInterval(fadeTimer);
    fadeTimer = null;
  }
  fadeTimer = window.setInterval(() => {
    if (!audio) return;
    const current = audio.volume;
    const next = to > current ? Math.min(to, current + 0.04) : Math.max(to, current - 0.04);
    audio.volume = next;
    if (next === to) {
      if (fadeTimer !== null) {
        window.clearInterval(fadeTimer);
        fadeTimer = null;
      }
      if (to === 0) audio.pause();
    }
  }, FADE_STEP_MS);
}

export function startAmbience(): void {
  if (!isSupported()) return;
  wanted = true;
  const element = ensureAudio();
  if (!element) return;
  const attempt = element.play();
  if (attempt !== undefined) {
    attempt
      .then(() => {
        playing = true;
        fade(LEVEL);
      })
      .catch(() => undefined);
  }
}

export function stopAmbience(fadeMs = 900): void {
  wanted = false;
  if (!audio || !playing) return;
  const steps = Math.max(1, Math.round(fadeMs / FADE_STEP_MS));
  fade(0);
  window.setTimeout(() => {
    if (!wanted && audio !== null) {
      audio.pause();
      playing = false;
    }
  }, steps * FADE_STEP_MS + 60);
}
