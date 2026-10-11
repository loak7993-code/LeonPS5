#!/usr/bin/env python3
"""Run the LeonPS5 GPU test set on a Kaggle GPU notebook.

Usage: python3 script.py  (Kaggle fills the environment at run time)
"""
import subprocess
import sys

STEPS = [
    # Toolchain check. The Kaggle GPU image ships git, cmake, ninja and g++
    # already; the guest build needs nothing beyond them.
    "which git cmake ninja g++",
    # The source tree comes from the attached dataset (the kernel has no
    # internet, so nothing is cloned).
    "cp -a /kaggle/input/leonps5-source/leonps5-src /kaggle/LeonPS5",
    "cp -a /kaggle/input/leonps5-source/ffmpeg-prebuilt /kaggle/ffmpeg-prebuilt",
    # Vulkan report first: which device did the runtime give us.
    "python3 -c \"import shutil; print(shutil.which('vulkaninfo'))\" || true",
    "(vulkaninfo --summary > /kaggle/working/vulkan-summary.txt 2>&1 || true)",
    "cat /kaggle/working/vulkan-summary.txt 2>/dev/null | grep -E 'deviceName|deviceType' || true",
    # Release build.
    "cd /kaggle/LeonPS5 && cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Release "
    "-DBUILD_TESTING=ON -DFFMPEG_PREBUILT_DIR=/kaggle/ffmpeg-prebuilt",
    "cd /kaggle/LeonPS5 && cmake --build build --parallel 2",
    # The full suite. Kaggle GPUs are T4/L4; the mesh tests skip or run per the
    # device's mesh-shader support and the summary shows which.
    "cd /kaggle/LeonPS5 && ctest --test-dir build --output-on-failure --timeout 180 -j2 "
    "> /kaggle/working/ctest-summary.txt 2>&1 || true",
    "tail -40 /kaggle/working/ctest-summary.txt",
    # GPU-only verdict: the tests that skip on llvmpipe.
    "grep -E 'agc_driver_mesh|agc_driver_graphics' /kaggle/working/ctest-summary.txt || true",
]


def main() -> int:
    for index, command in enumerate(STEPS, start=1):
        print(f"== [{index}/{len(STEPS)}] {command[:120]}", flush=True)
        result = subprocess.run(command, shell=True, text=True)
        if result.returncode != 0 and index not in (3, 9, 10):
            # Steps 3, 9 and 10 already carry their own `|| true` semantics for
            # reporting; anything else failing stops the kernel.
            print(f"step {index} failed", flush=True)
            return 1
    print("LeonPS5 GPU test run complete", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
