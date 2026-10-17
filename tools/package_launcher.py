import argparse
import os
import shutil
import stat
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "launcher"))

from brand import ICON_512_PNG_BASE64, ICON_ICO_BASE64

LAUNCHER_DIR = Path(__file__).resolve().parent / "launcher"
WEB_DIR = LAUNCHER_DIR / "web"
DIST_DIR = WEB_DIR / "dist"
APPIMAGE_TOOL_URL = (
    "https://github.com/AppImage/AppImageKit/releases/download/continuous/"
    "appimagetool-x86_64.AppImage"
)


def write_brand_icon(path):
    import base64

    Path(path).write_bytes(base64.b64decode(ICON_512_PNG_BASE64))


def write_brand_ico(path):
    import base64

    Path(path).write_bytes(base64.b64decode(ICON_ICO_BASE64))


def check_dist():
    index = DIST_DIR / "index.html"
    if not index.is_file():
        raise RuntimeError(f"UI build missing: {index}. Run npm run build in {WEB_DIR} first.")


def package_windows(version, output):
    check_dist()
    build_root = Path(tempfile.mkdtemp(prefix="leonps5-launcher-windows-"))
    try:
        server_source = LAUNCHER_DIR / "server.py"
        data_dir = DIST_DIR
        icon_path = build_root / "brand.ico"
        write_brand_ico(icon_path)
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
                    "exe = EXE(pyz, a.scripts, a.binaries, a.datas, [], name='launcher', console=False, upx=False, icon=r'" + str(icon_path) + "')",
                ]
            ),
            encoding="utf-8",
        )
        command = [
            sys.executable,
            "-m",
            "PyInstaller",
            "--noconfirm",
            "--clean",
            "--distpath",
            str(build_root / "out"),
            "--workpath",
            str(build_root / "work"),
            str(spec),
        ]
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
    try:
        appdir = build_root / "LeonPS5.AppDir"
        try:
            payload = appdir / "usr" / "lib" / "leonps5"
            payload.mkdir(parents=True)
            shutil.copy2(LAUNCHER_DIR / "server.py", payload / "server.py")
            shutil.copy2(LAUNCHER_DIR / "brand.py", payload / "brand.py")
            shutil.copytree(DIST_DIR, payload / "web" / "dist")
            docs = Path("docs/user")
            for document in sorted(docs.glob("*.md")):
                shutil.copy2(document, payload / document.name)
            readme = LAUNCHER_DIR / "README.md"
            if readme.is_file():
                shutil.copy2(readme, payload / "README.md")
            icon_dir = appdir / "usr" / "share" / "icons"
            icon_dir.mkdir(parents=True, exist_ok=True)
            write_brand_icon(icon_dir / "leonps5.png")
            icon = appdir / "leonps5.png"
            write_brand_icon(icon)
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
            pass
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
