# GPU cloud testing

The AGC driver's GPU execution tests (mesh draws, pipeline libraries, pixel readback) need a real Vulkan device. A development container without one reports `llvmpipe` and the deepest tests skip. This page has the two one-command ways to run the GPU test set on a cloud GPU.

## Google Colab (free T4/L4, no account CLI needed)

Google Colab has no command-line interface: the runtime is created in the browser. Open [colab.research.google.com](https://colab.research.google.com), create a notebook, pick `Runtime > Change runtime type > T4 GPU` (or `L4`; the mesh tests need `VK_EXT_mesh_shader`, which Turing-era T4s do not expose, so prefer L4/A100 when offered), then paste this single cell and run it:

```python
%%bash
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -yqq git cmake ninja-build g++ libx11-dev libxext-dev python3 mesa-vulkan-drivers vulkan-tools >/dev/null

cat > /root/.gitconfig <<'CFG'
[url "https://github.com/"]
  insteadOf = git@github.com:
CFG

git clone --depth 1 https://github.com/loak7993-code/LeonPS5.git /content/LeonPS5
cd /content/LeonPS5
git submodule update --init --recursive core/libs core/relinker 3rdparty/SDL2 3rdparty/freetype 3rdparty/libjpeg-turbo 3rdparty/stb 3rdparty/ffmpeg-core 3rdparty/LibAtrac9

cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Release -DBUILD_TESTING=ON
cmake --build build --parallel 2
ctest --test-dir build --output-on-failure --timeout 180 -j2
vulkaninfo --summary | grep -E "deviceName|deviceType" || true
```

The cell takes 10 to 20 minutes on the free tier. The lines to look at in the output:

- `agc_driver_mesh` runs (not skips) and reports pixel readback results; on a T4 it may still skip if the driver lacks `VK_EXT_mesh_shader`, on an L4/A100 it runs.
- `100% tests passed` at the end.
- `deviceName` from `vulkaninfo` should name the GPU, not `llvmpipe`.

## Kaggle (scriptable from this machine, needs your API token)

Kaggle's CLI can drive a GPU notebook without the browser. Get a token from kaggle.com `Settings > API > Create New Token`, save it as `~/.kaggle/kaggle.json` on this machine, and then the launch, build and test runs are drivable from here end to end. Without the token this path cannot start.

## What the GPU tests cover

The tests that skip on llvmpipe and run on a real device:

- `agc_driver_mesh`: NGG mesh draws with pixel readback, wave32 and wave64.
- The AGC execution set with real pipeline libraries and render targets (`agc_driver_graphics*`).
- The full suite is the same 699-test set; a GPU only un-skips the device-dependent part.

## Kaggle account gate: unverified phones get no driver userspace

A probe kernel on the GPU runtime showed what the image actually contains for an
account without phone verification: the GPU device is attached, but there are no
NVIDIA userspace libraries at all (no `libnvidia-*` anywhere, no `nvidia-smi`,
`/etc/vulkan/icd.d` empty). `vkCreateInstance` therefore fails with
`VK_ERROR_INCOMPATIBLE_DRIVER` (-9) no matter which accelerator (T4 or L4) the
session picks; only `llvmpipe` would work, and the loader deb fixes the loader
but not the absent vendor ICD. The vendor libraries are also not installable:
the runtime has no internet (the same phone-verification gate blocks it) and the
driver version must match the passthrough kernel module anyway.

The account-level fix: verify a phone number at kaggle.com `Settings > Phone`.
That enables kernel internet, after which the install steps in the kernel script
can pull the vendor ICD packages and the GPU execution tests run for real.

## Why not the local container

This development container's GPU is a `virtio-gpu` display device without the host-side Venus Vulkan backend, so Vulkan enumerates only `llvmpipe` (software). There is no host GPU to enable from inside the VM, and the CoreWeave SSH boxes in the SSH config are currently closed on all their ports.
