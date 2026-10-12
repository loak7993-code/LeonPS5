const CHORDS: number[][] = [
  [48, 52, 55, 59, 62],
  [45, 48, 52, 55, 59],
  [41, 45, 48, 52, 55],
  [43, 47, 50, 52, 57],
];
const SPARKLES = [72, 74, 76, 79, 81, 84];
const LEVEL = 0.35;
const CHORD_EVERY_MS = 10000;
const SPARKLE_EVERY_MS = 7000;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let filter: BiquadFilterNode | null = null;
let delay: DelayNode | null = null;
let chordTimer: number | null = null;
let sparkleTimer: number | null = null;
let chordIndex = 0;
let playing = false;

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function isSupported(): boolean {
  return typeof window !== "undefined" && typeof window.AudioContext !== "undefined";
}

export function isPlaying(): boolean {
  return playing;
}

export function unlock(): void {
  if (!isSupported()) return;
  if (ctx === null) {
    ctx = new AudioContext();
    buildGraph();
  }
  if (ctx.state === "suspended") void ctx.resume();
}

function buildGraph(): void {
  if (ctx === null) return;
  master = ctx.createGain();
  master.gain.value = 0;
  filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1150;
  filter.Q.value = 0.4;
  filter.connect(master);
  master.connect(ctx.destination);
  delay = ctx.createDelay(1);
  delay.delayTime.value = 0.42;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.28;
  const wet = ctx.createGain();
  wet.gain.value = 0.3;
  filter.connect(delay);
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(wet);
  wet.connect(filter);
}

function voice(midi: number, now: number, level: number, type: OscillatorType): void {
  if (ctx === null || filter === null) return;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = midiToFreq(midi);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(level, now + 2.6);
  gain.gain.setValueAtTime(level, now + 7.5);
  gain.gain.linearRampToValueAtTime(0, now + 13);
  osc.connect(gain);
  gain.connect(filter);
  osc.start(now);
  osc.stop(now + 13.4);
}

function playChord(): void {
  if (ctx === null || !playing) return;
  const now = ctx.currentTime;
  const chord = CHORDS[chordIndex % CHORDS.length];
  chordIndex += 1;
  for (const midi of chord) {
    voice(midi, now, 0.05, "triangle");
    voice(midi + 12, now, 0.012, "sine");
  }
}

function scheduleChord(): void {
  playChord();
  chordTimer = window.setTimeout(scheduleChord, CHORD_EVERY_MS);
}

function sparkle(): void {
  if (ctx === null || filter === null || !playing) return;
  const now = ctx.currentTime;
  const midi = SPARKLES[Math.floor(Math.random() * SPARKLES.length)];
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = midiToFreq(midi);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.018, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);
  osc.connect(gain);
  gain.connect(filter);
  osc.start(now);
  osc.stop(now + 3.4);
  sparkleTimer = window.setTimeout(sparkle, SPARKLE_EVERY_MS + Math.random() * 5000);
}

export function startAmbience(): void {
  if (!isSupported() || playing) return;
  unlock();
  if (ctx === null || ctx.state !== "running") return;
  playing = true;
  master!.gain.cancelScheduledValues(ctx.currentTime);
  master!.gain.setTargetAtTime(LEVEL, ctx.currentTime, 1.4);
  chordIndex = Math.floor(Math.random() * CHORDS.length);
  scheduleChord();
  sparkleTimer = window.setTimeout(sparkle, SPARKLE_EVERY_MS);
}

export function stopAmbience(fadeMs = 900): void {
  if (!playing) return;
  playing = false;
  if (chordTimer !== null) {
    window.clearTimeout(chordTimer);
    chordTimer = null;
  }
  if (sparkleTimer !== null) {
    window.clearTimeout(sparkleTimer);
    sparkleTimer = null;
  }
  if (ctx !== null && master !== null) {
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0, ctx.currentTime, fadeMs / 3000);
  }
}
