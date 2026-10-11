import argparse
import os
import shutil
import stat
import struct
import subprocess
import sys
import urllib.request
import zipfile
from pathlib import Path

LAUNCHER_DIR = Path(__file__).resolve().parent / "launcher"
WEB_DIR = LAUNCHER_DIR / "web"
DIST_DIR = WEB_DIR / "dist"
APPIMAGE_TOOL_URL = (
    "https://github.com/AppImage/AppImageKit/releases/download/continuous/"
    "appimagetool-x86_64.AppImage"
)
ICON_COLORS = ((10, 20, 90), (47, 107, 255), (220, 230, 255))


def check_dist():
    index = DIST_DIR / "index.html"
    if not index.is_file():
        raise RuntimeError(f"UI build missing: {index}. Run npm run build in {WEB_DIR} first.")


def require_web_source():
    if not (WEB_DIR / "package.json").is_file():
        raise RuntimeError(f"Web source missing: {WEB_DIR}")


def write_png(path, size):
    row_padding = (4 - (size * 3) % 4) % 4
    stride = size * 3 + row_padding
    raw = bytearray()
    radius = size // 5
    for y in range(size):
        raw.append(0)
        for x in range(size):
            in_corner = (x < radius and y < radius and (radius - x) ** 2 + (radius - y) ** 2 > radius ** 2)
            in_corner = in_corner or (
                x >= size - radius and y < radius and (x - (size - radius - 1)) ** 2 + (radius - y) ** 2 > radius ** 2
            )
            if in_corner:
                raw += bytes((7, 10, 27))
                continue
            distance = ((x - size * 0.3) ** 2 + (y - size * 0.35) ** 2) ** 0.5 / (size * 0.75)
            blend = max(0.0, min(1.0, 1.0 - distance))
            top, bottom, highlight = ICON_COLORS
            pixel = tuple(
                int(top[channel] + (bottom[channel] - top[channel]) * blend) for channel in range(3)
            )
            if abs(y - size * 0.62) < size * 0.045 and size * 0.18 < x < size * 0.82:
                pixel = highlight
            if abs(y - size * 0.62 + size * 0.14) < size * 0.03 and size * 0.30 < x < size * 0.70:
                pixel = highlight
            raw += bytes(pixel)
        raw += b"\x00" * row_padding

    def chunk(tag, data):
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib_crc32(body))

    def zlib_crc32(data):
        import zlib

        return zlib.crc32(data) & 0xFFFFFFFF

    header = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    content = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", bytes(raw)) + chunk(b"IEND", b"")
    path.write_bytes(content)


def package_windows(version, output):
    require_web_source()
    build_dir = output / "launcher-pyinstaller"
    shutil.rmtree(build_dir, ignore_errors=True)
    spec = output / "launcher.spec"
    server_source = LAUNCHER_DIR / "server.py"
    data_dir = DIST_DIR
    work_path = output / "launcher-pyinstaller"
    spec.write_text(
        "\n".join(
            [
                "# -*- mode: python ; coding: utf-8 -*-",
                "a = Analysis(",
                f"    [r'{server_source}'],",
                "    pathex=[],",
                f"    datas=[(r'{data_dir}', 'dist')],",
                "    hiddenimports=[],",
                "    excludes=['tkinter'],",
                ")",
                "pyz = PYZ(a.pure)",
                "exe = EXE(pyz, a.scripts, a.binaries, a.datas, [], name='launcher', console=False, upx=False)",
            ]
        ),
        encoding="utf-8",
    )
    command = [sys.executable, "-m", "PyInstaller", "--noconfirm", "--clean", "--distpath", str(work_path), "--workpath", str(work_path / "build"), str(spec)]
    subprocess.run(command, check=True)
    binary_name = "launcher.exe" if os.name == "nt" else "launcher"
    binary = work_path / binary_name
    if not binary.is_file() or binary.stat().st_size == 0:
        raise RuntimeError("PyInstaller did not produce the launcher executable")
    if os.name == "nt":
        shutil.copy2(binary, output / f"launcher-{version}.exe")
        print(f"Windows exe: {output / ('launcher-' + version + '.exe')}")
    else:
        staged = output / f"launcher-{version}"
        shutil.copy2(binary, staged)
        staged.chmod(staged.stat().st_mode | stat.S_IEXEC)
        print(f"Host binary for verification: {staged}")


def package_linux(version, output):
    check_dist()
    appdir = output / "LeonPS5.AppDir"
    shutil.rmtree(appdir, ignore_errors=True)
    payload = appdir / "usr" / "lib" / "leonps5"
    payload.mkdir(parents=True)
    shutil.copy2(LAUNCHER_DIR / "server.py", payload / "server.py")
    shutil.copytree(DIST_DIR, payload / "web" / "dist")
    docs = Path("docs/user")
    for document in sorted(docs.glob("*.md")):
        shutil.copy2(document, payload / document.name)
    readme = Path("tools/launcher/README.md")
    if readme.is_file():
        shutil.copy2(readme, payload / "README.md")
    icon = appdir / "leonps5.png"
    write_png(icon, 256)
    (appdir / "leonps5.desktop").write_text(
        "\n".join(
            [
                "[Desktop Entry]",
                "Type=Application",
                "Name=LeonPS5 Launcher",
                "Comment=Home screen for the LeonPS5 project",
                "Exec=AppRun",
                "Icon=leonps5",
                "Categories=Game;Emulator;",
                "Terminal=false",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    apprun = appdir / "AppRun"
    apprun.write_text(
        "\n".join(
            [
                "#!/bin/sh",
                'APPDIR=$(dirname "$(readlink -f "$0")")',
                'exec python3 "$APPDIR/usr/lib/leonps5/server.py" \\',
                '  --web-dir "$APPDIR/usr/lib/leonps5/web/dist" \\',
                '  --games-dir "${LEONPS5_GAMES_DIR:-$HOME/Games/LeonPS5}" \\',
                '  --open "$@"',
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    apprun.chmod(apprun.stat().st_mode | stat.S_IEXEC)
    tool = output / "appimagetool.AppImage"
    if not tool.is_file():
        urllib.request.urlretrieve(APPIMAGE_TOOL_URL, tool)
    tool.chmod(tool.stat().st_mode | stat.S_IEXEC)
    target = output / f"launcher-{version}.AppImage"
    subprocess.run(
        [str(tool), "--appimage-extract-and-run", str(appdir), str(target), "-n"],
        check=True,
        cwd=str(output),
    )
    target.chmod(target.stat().st_mode | stat.S_IEXEC)
    print(f"AppImage: {target}")


def main():
    parser = argparse.ArgumentParser(description="Package the LeonPS5 launcher for release")
    parser.add_argument("--platform", choices=("linux", "windows"), required=True)
    parser.add_argument("--version", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    version = args.version
    if not version.startswith("v") or version.endswith("."):
        raise ValueError(f"Invalid release tag for asset filenames: {version}")
    args.output.mkdir(parents=True, exist_ok=True)
    if args.platform == "windows":
        package_windows(version, args.output)
    else:
        package_linux(version, args.output)


if __name__ == "__main__":
    main()