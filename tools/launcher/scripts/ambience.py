#!/usr/bin/env python3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from server import synth_ambience

if __name__ == "__main__":
    synth_ambience(sys.argv[1] if len(sys.argv) > 1 else "ambience.wav")
