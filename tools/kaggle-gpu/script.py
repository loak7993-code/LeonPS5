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
    # Vulkan loader. The Kaggle GPU image ships the NVIDIA driver but not the
    # Vulkan loader or ICD, so vkCreateInstance fails with INCOMPATIBLE_DRIVER.
    # The loader deb rides in the dataset; the ICD json is written from a glob
    # over the driver's Vulkan library.
    "dpkg -i /kaggle/input/leonps5-source/debs/*.deb || true",
    "mkdir -p /usr/share/vulkan/icd.d",

    "NVLIB=$(find /usr/local/nvidia /usr/lib/x86_64-linux-gnu /usr/lib/x86_64-linux-gnu/nvidia -maxdepth 3 -name 'libGLX_nvidia.so*' 2>/dev/null | head -1)",
    "echo nvidia icd library: $NVLIB",
    "if [ -n \"$NVLIB\" ]; then printf '{\"ICD\":{\"library_path\":\"%s\",\"api_version\":\"1.3.204\"}}\n' \"$NVLIB\" > /usr/share/vulkan/icd.d/nvidia_icd.json; fi",
    "cat /usr/share/vulkan/icd.d/nvidia_icd.json 2>/dev/null || true",
    "export LEONPS5_GPU=NVIDIA",
    "ls /usr/lib/x86_64-linux-gnu/ | grep -iE 'nvidia|vulkan' | head -12",
    # The source tree comes from the attached dataset (the kernel has no
    # internet, so nothing is cloned).
    "cp -a /kaggle/input/leonps5-source/leonps5-src /kaggle/LeonPS5",
    "cp -a /kaggle/input/leonps5-source/leonps5-build /kaggle/LeonPS5-build",
    "cp -a /kaggle/LeonPS5-build /kaggle/LeonPS5/build",
    "cp -a /kaggle/input/leonps5-source/ffmpeg-prebuilt /kaggle/ffmpeg-prebuilt",
    # Vulkan report first: which device did the runtime give us.
    "python3 -c \"import shutil; print(shutil.which('vulkaninfo'))\" || true",
    "(vulkaninfo --summary > /kaggle/working/vulkan-summary.txt 2>&1 || true)",
    "cat /kaggle/working/vulkan-summary.txt 2>/dev/null | grep -E 'deviceName|deviceType' || true",
    # Release build.
    "cd /kaggle/LeonPS5 && cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Release "
    "-DBUILD_TESTING=ON -DFFMPEG_PREBUILT_DIR=/kaggle/ffmpeg-prebuilt",
    "cd /kaggle/LeonPS5/build && ninja -n | grep -cE '^$' || true; "
    "ninja -n 2>/dev/null | tail -1",
    "cd /kaggle/LeonPS5 && ninja -C build 2>&1 | tail -2 || true",
    # The full suite. Kaggle GPUs are T4/L4; the mesh tests skip or run per the
    # device's mesh-shader support and the summary shows which.
    "cd /kaggle/LeonPS5 && ctest --test-dir build --output-on-failure --timeout 180 -j4 "
    "> /kaggle/working/ctest-summary.txt 2>&1 || true",
    "tail -40 /kaggle/working/ctest-summary.txt",
    # GPU-only verdict: the tests that skip on llvmpipe.
    "grep -E 'agc_driver_mesh|agc_driver_graphics' /kaggle/working/ctest-summary.txt || true",
    # The mesh skip reason goes to the worker stdout that ctest hides; run the
    # test directly so the device verdict lands in the kernel output.
    "cd /kaggle/LeonPS5 && ./build/tests/agc_driver_mesh_tests "
    "> /kaggle/working/mesh-direct.txt 2>&1 || true",
    "cat /kaggle/working/mesh-direct.txt || true",
]


def main() -> int:
    for index, command in enumerate(STEPS, start=1):
        print(f"== [{index}/{len(STEPS)}] {command[:120]}", flush=True)
        result = subprocess.run(command, shell=True, text=True, check=False)
        if result.returncode != 0 and index not in (3, 9, 10):
            # Steps 3, 9 and 10 already carry their own `|| true` semantics for
            # reporting; anything else failing stops the kernel.
            print(f"step {index} failed", flush=True)
            return 1
    print("LeonPS5 GPU test run complete", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
