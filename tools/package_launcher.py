import argparse
import os
import shutil
import stat
import struct
import subprocess
import sys
import tempfile
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


GLYPH_PATHS = (
    ((150, 130), ((150, 130), (150, 370), (255, 370))),
    ((150, 130), ((415, 130), (255, 130), (255, 248), (415, 248), (415, 370), (255, 370))),
)
VIEWBOX = 512


def stroke_mask(size):
    scale = size / VIEWBOX
    half = 20 * scale
    mask = bytearray(size * size)

    def paint_circle(cx, cy, radius):
        for y in range(max(0, int(cy - radius)), min(size, int(cy + radius) + 1)):
            inner = radius * radius - (y - cy) ** 2
            span = inner ** 0.5 if inner > 0 else 0.0
            for x in range(max(0, int(cx - span)), min(size, int(cx + span) + 1)):
                mask[y * size + x] = 1

    def paint_segment(a, b, radius):
        dx, dy = b[0] - a[0], b[1] - a[1]
        length = (dx * dx + dy * dy) ** 0.5 or 1.0
        steps = int(length * 2) + 2
        for index in range(steps + 1):
            t = index / steps
            paint_circle(a[0] + dx * t, a[1] + dy * t, radius)

    for cap, points in GLYPH_PATHS:
        paint_circle(points[0][0] * scale, points[0][1] * scale, half)
        for point in points[1:]:
            paint_circle(point[0] * scale, point[1] * scale, half)
        for first, second in zip(points, points[1:]):
            paint_segment(
                (first[0] * scale, first[1] * scale),
                (second[0] * scale, second[1] * scale),
                half,
            )
    return mask


def write_png(path, size):
    row_padding = (4 - (size * 3) % 4) % 4
    stride = size * 3 + row_padding
    raw = bytearray()
    radius = size // 5
    tile_color = ICON_COLORS[1]
    accent = ICON_COLORS[2]
    glyph = stroke_mask(size)
    for y in range(size):
        raw.append(0)
        for x in range(size):
            in_corner = (x < radius and y < radius and (radius - x) ** 2 + (radius - y) ** 2 > radius ** 2)
            in_corner = in_corner or (
                x >= size - radius and y < radius and (x - (size - radius - 1)) ** 2 + (radius - y) ** 2 > radius ** 2
            )
            if glyph[y * size + x]:
                raw += bytes((255, 255, 255))
            elif in_corner:
                raw += bytes((7, 10, 27))
            else:
                distance = ((x - size * 0.3) ** 2 + (y - size * 0.35) ** 2) ** 0.5 / (size * 0.75)
                blend = max(0.0, min(1.0, 1.0 - distance))
                top, bottom, _ = ICON_COLORS
                raw += bytes(
                    int(top[channel] + (bottom[channel] - top[channel]) * blend) for channel in range(3)
                )
        raw += b"\x00" * row_padding

    import zlib

    def chunk(tag, data):
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)

    header = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    content = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + chunk(b"IEND", b"")
    )
    Path(path).write_bytes(content)


def package_windows(version, output):
    require_web_source()
    build_root = Path(tempfile.mkdtemp(prefix="leonps5-launcher-windows-"))
    try:
        server_source = LAUNCHER_DIR / "server.py"
        data_dir = DIST_DIR
        spec = build_root / "launcher.spec"
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
        command = [sys.executable, "-m", "PyInstaller", "--noconfirm", "--clean", "--distpath", str(build_root / "out"), "--workpath", str(build_root / "work"), str(spec)]
        subprocess.run(command, check=True)
        binary_name = "launcher.exe" if os.name == "nt" else "launcher"
        binary = build_root / "out" / binary_name
        if not binary.is_file() or binary.stat().st_size == 0:
            raise RuntimeError("PyInstaller did not produce the launcher executable")
        if os.name == "nt":
            target = output / f"launcher-windows-{version}.exe"
            shutil.copy2(binary, target)
            print(f"Windows exe: {target}")
        else:
            staged = output / f"launcher-{version}"
            shutil.copy2(binary, staged)
            staged.chmod(staged.stat().st_mode | stat.S_IEXEC)
            print(f"Host binary for verification: {staged}")
    finally:
        shutil.rmtree(build_root, ignore_errors=True)


def package_linux(version, output):
    check_dist()
    build_root = Path(tempfile.mkdtemp(prefix="leonps5-launcher-linux-"))
    appdir = build_root / "LeonPS5.AppDir"
    try:
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
        tool = build_root / "appimagetool.AppImage"
        if not tool.is_file():
            urllib.request.urlretrieve(APPIMAGE_TOOL_URL, tool)
        tool.chmod(tool.stat().st_mode | stat.S_IEXEC)
        target = (output / f"launcher-linux-{version}.AppImage").resolve()
        subprocess.run(
            [str(tool), "--appimage-extract-and-run", str(appdir.resolve()), str(target), "-n"],
            check=True,
        )
        target.chmod(target.stat().st_mode | stat.S_IEXEC)
        print(f"AppImage: {target}")
    finally:
        shutil.rmtree(build_root, ignore_errors=True)


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