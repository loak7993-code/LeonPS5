let context: AudioContext | null = null;
let enabled = true;

function ensure(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const win = window as typeof window & { webkitAudioContext?: typeof AudioContext };
  const Ctor = window.AudioContext ?? win.webkitAudioContext;
  if (typeof Ctor !== "function") return null;
  if (context === null) context = new Ctor();
  if (context.state === "suspended") {
    const attempt = context.resume();
    if (attempt !== undefined) attempt.catch(() => undefined);
  }
  return context;
}

export function setSoundsEnabled(on: boolean): void {
  enabled = on;
}

export function primeSounds(): void {
  ensure();
}

function blip(at: number, freq: number, duration: number, gain: number, type: OscillatorType): void {
  const audio = ensure();
  if (audio === null || !enabled) return;
  const start = audio.currentTime + at;
  const osc = audio.createOscillator();
  const amp = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  amp.gain.setValueAtTime(0, start);
  amp.gain.linearRampToValueAtTime(gain, start + 0.006);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(amp);
  amp.connect(audio.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export function tick(): void {
  blip(0, 2100, 0.045, 0.035, "sine");
}

export function confirm(): void {
  blip(0, 660, 0.07, 0.05, "sine");
  blip(0.055, 990, 0.09, 0.045, "sine");
}

export function back(): void {
  blip(0, 520, 0.06, 0.04, "sine");
  blip(0.05, 340, 0.08, 0.035, "sine");
}

export function chime(): void {
  blip(0, 523.25, 0.12, 0.05, "sine");
  blip(0.09, 659.25, 0.12, 0.05, "sine");
  blip(0.18, 783.99, 0.2, 0.05, "sine");
}

export function buzz(): void {
  blip(0, 170, 0.16, 0.05, "square");
}
