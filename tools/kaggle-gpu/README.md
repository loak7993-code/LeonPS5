# LeonPS5 GPU test set on a Kaggle T4/L4

Kaggle is the one GPU cloud that is fully scriptable from a terminal without a browser. The CLI is installed on this machine (`pip install kaggle`). The only missing piece is the account token.

## One-time setup

1. On kaggle.com open `Settings > API > Create New Token`. The browser downloads `kaggle.json`.
2. Give the two values inside it (`username`, `key`) to the operator session, which writes `~/.kaggle/kaggle.json` and runs:

```sh
kaggle kernels push -p tools/kaggle-gpu/
kaggle kernels status <username>/leonps5-gpu-test -w
kaggle kernels output <username>/leonps5-gpu-test -p /tmp/kaggle-out
```

`push` starts the GPU run, `status` polls it, `output` downloads the log and the test summary.

## What the kernel runs

`script.py` in this directory is the kernel body. It installs the build toolchain, clones this fork, initializes the submodules, configures and builds the release tree, runs the full ctest suite on the Kaggle GPU (T4 or L4; prefer L4 for `VK_EXT_mesh_shader`), and writes the ctest summary plus a `vulkaninfo` device report into the kernel output.

## Runtime notes

- Kaggle gives 30 GPU-hours per week on the free tier; this run needs about 25 GPU-minutes.
- T4 (Turing) lacks `VK_EXT_mesh_shader`, so `agc_driver_mesh` may skip there; L4 and A100 run it. The metadata enables the T4 x2 image by default because every account has it; switch `enable_gpu` to L4 in `kernel-metadata.json` when the account offers it.
- Internet is enabled in the metadata for the submodule clones and the FFmpeg download.
