# LeonPS5

Tool for automatic executables porting to Linux and Windows.

Includes a [relinker](core/relinker) that converts executable to the target system's native format and implementations of [system prx libraries](core/libs/prx) suitable for dynamic linking. No emulation or separate runtime process.

One command converts a game and runs it:

```sh
leonps5 <game-directory-or-elf> [output-directory]
```

[Usage](docs/user/USAGE.md), [Build instructions](docs/dev/BUILD.md), [Architecture](docs/dev/ARCHITECTURE.md), [Technical debt of the project](docs/dev/TechnicalDebt.md), [code style conventions](docs/dev/CONVENTIONS.md), [contributing](CONTRIBUTING.md)

## Status

[![libraries](https://loak7993-code.github.io/LeonPS5/badge-libraries.svg)](https://loak7993-code.github.io/LeonPS5/) [![shaders](https://loak7993-code.github.io/LeonPS5/badge-shaders.svg)](https://loak7993-code.github.io/LeonPS5/)

[![progress map](https://loak7993-code.github.io/LeonPS5/progress.svg)](https://loak7993-code.github.io/LeonPS5/)

<sub>* System libraries: percentage of the functions known to the project so far (declared in [core/libs/prx](core/libs/prx)), not of every PS5 system function. The total grows as more functions are declared.</sub>

[List of verified games](docs/user/COMPATIBILITY.md)

Dreaming Sarah (2D platformer) runs at a stable 60 fps on a GTX 1050 Ti / i5-7500 3.4GHz.

Unsupported or unexpected states strictly throw `std::runtime_error`. `what()` is printed to stderr and the process terminates.

The [shader recompiler](core/shader/recompiler/Recompiler.cpp) successfully produces SPIR-V (validated via [Spirv-Tools](3rdparty/SPIRV-Tools) when built with `LEONPS5_ENABLE_SPIRV_TOOLS`).

## Compatibility

See the [game compatibility list](docs/user/COMPATIBILITY.md) for tested games and known issues.

## Input mapping

SDL-mapped game controllers are supported, including analog sticks and triggers. Keyboard and mouse controls can be configured with a `leonps5-input.ini` file. See [input mapping](docs/user/INPUT_MAPPING.md) for the supported devices and configuration format.

## Renamed configuration

This fork continues [boykopovar/AnyPS5](https://github.com/boykopovar/AnyPS5) under its own name. Names changed accordingly: the runner binary is `leonps5`, runtime directories are `leonps5-out/` and `leonps5-fonts/`, the input mapping file is `leonps5-input.ini`, and the environment variables and CMake switches use the `LEONPS5_` prefix (`LEONPS5_GPU`, `LEONPS5_SYSTEM_FONTS`, `LEONPS5_RELINKER_ONLY`, `LEONPS5_ENABLE_SPIRV_TOOLS`). Internal ABI macros keep the upstream `APS5_` prefix (`APS5_VABI`, `APS5_EXPORT`) so upstream patch sets stay applicable.

## Disclaimer

This project is intended for interoperability, research, preservation, and compatibility purposes. It does not include, distribute, or require copyrighted software, firmware, cryptographic keys, or proprietary libraries. Users are responsible for ensuring that any binaries used with this project are obtained and used in accordance with applicable laws and their respective license terms.

## License

This project is licensed under the GNU General Public License version 2 only.
