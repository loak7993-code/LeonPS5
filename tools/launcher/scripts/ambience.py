#!/usr/bin/env python3
import sys
from pathlib import Path

def synth(path, seconds=48, rate=44100):
    """Render a seamless ambient pad loop (Cmaj9, Am9, Fmaj9, G6/9) to a wav file."""
    import array as arraymod
    import math as mathmod
    import wave

    if Path(path).is_file():
        return
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    total = seconds * rate
    chords = [
        [48, 52, 55, 59, 62],
        [45, 48, 52, 55, 59],
        [41, 45, 48, 52, 55],
        [43, 47, 50, 52, 57],
    ]
    sparkle_notes = [72, 74, 76, 79, 81, 84]
    section = seconds / len(chords)
    fade = 3.0
    left = arraymod.array("f", [0.0] * total)
    right = arraymod.array("f", [0.0] * total)

    def midi_freq(m):
        return 440.0 * 2 ** ((m - 69) / 12)

    def add_note(start_s, dur_s, freq, level, pan):
        start_i = int(start_s * rate) % total
        dur_i = int(dur_s * rate)
        detune = freq * 1.003
        for i in range(dur_i):
            t = i / rate
            attack = min(1.0, t / 2.2)
            release = min(1.0, (dur_s - t) / 2.5)
            env = attack * release
            if env <= 0:
                continue
            v = mathmod.sin(2 * mathmod.pi * freq * t)
            v += 0.45 * mathmod.sin(2 * mathmod.pi * detune * t)
            v += 0.2 * mathmod.sin(2 * mathmod.pi * freq * 2 * t)
            sample = v * env * level
            pos = (start_i + i) % total
            left[pos] += sample * (1.0 - pan)
            right[pos] += sample * pan

    for index, chord in enumerate(chords):
        start_s = index * section
        add_note(start_s, section + fade, midi_freq(chord[0]) / 2, 0.16, 0.5)
        for note in chord[1:]:
            add_note(start_s, section + fade, midi_freq(note), 0.075, 0.5)
        if index % 2 == 0:
            sparkle_at = start_s + 2.0 + (index * 1.7) % (section - 6)
            add_note(sparkle_at, 4.0, midi_freq(sparkle_notes[index % len(sparkle_notes)]) * 2, 0.05, 0.35)

    peak = 0.0
    for index in range(total):
        peak = max(peak, abs(left[index]), abs(right[index]))
    gain = 0.42 / peak if peak > 0 else 1.0
    for index in range(total):
        left[index] *= gain
        right[index] *= gain
        if left[index] > 1.0:
            left[index] = 1.0
        if left[index] < -1.0:
            left[index] = -1.0
        if right[index] > 1.0:
            right[index] = 1.0
        if right[index] < -1.0:
            right[index] = -1.0

    with wave.open(str(path), "wb") as handle:
        handle.setnchannels(2)
        handle.setsampwidth(2)
        handle.setframerate(rate)
        frames = arraymod.array("h", [0] * (total * 2))
        for index in range(total):
            frames[index * 2] = int(left[index] * 32767)
            frames[index * 2 + 1] = int(right[index] * 32767)
        handle.writeframes(frames.tobytes())




if __name__ == "__main__":
    synth(sys.argv[1] if len(sys.argv) > 1 else "ambience.wav")
