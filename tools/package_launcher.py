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


def check_dist():
    index = DIST_DIR / "index.html"
    if not index.is_file():
        raise RuntimeError(f"UI build missing: {index}. Run npm run build in {WEB_DIR} first.")


def require_web_source():
    if not (WEB_DIR / "package.json").is_file():
        raise RuntimeError(f"Web source missing: {WEB_DIR}")


ACCENT = (47, 107, 255)
TEAL = (63, 169, 201)
NAVY_TOP = (18, 34, 94)
NAVY_MID = (10, 19, 56)
NAVY_END = (7, 11, 28)
WAVE_INK = (244, 246, 255)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def bezier(p0, p1, p2, p3, steps=48):
    points = []
    for index in range(steps + 1):
        t = index / steps
        u = 1 - t
        x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0]
        y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]
        points.append((x, y))
    return points


def stroke_canvas(size, points, radius, alpha):
    canvas = bytearray(size * size)
    scale = size / 512.0
    mapped = [(x * scale, y * scale) for x, y in points]

    def paint_circle(cx, cy, r, a):
        for y in range(max(0, int(cy - r)), min(size, int(cy + r) + 1)):
            inner = r * r - (y - cy) ** 2
            span = inner ** 0.5 if inner > 0 else 0.0
            base = y * size
            for x in range(max(0, int(cx - span)), min(size, int(cx + span) + 1)):
                canvas[base + x] = a

    def paint_segment(a, b, r, a_level):
        dx, dy = b[0] - a[0], b[1] - a[1]
        length = (dx * dx + dy * dy) ** 0.5 or 1.0
        steps = int(length) + 2
        for index in range(steps + 1):
            t = index / steps
            paint_circle(a[0] + dx * t, a[1] + dy * t, r, a_level)

    half = 19 * scale
    paint_circle(mapped[0][0], mapped[0][1], half, alpha)
    for first, second in zip(mapped, mapped[1:]):
        paint_segment(first, second, half, alpha)
    return canvas


def blend_over(base, layer, value, alpha):
    return tuple(
        int(base[i] + (value[i] - base[i]) * (alpha / 255)) for i in range(3)
    )


def write_png(path, size):
    import zlib

    def chunk(tag, data):
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)

    row_padding = (4 - (size * 3) % 4) % 4
    raw = bytearray()
    glyph = stroke_canvas(size, GLYPH_STROKE, 19, 255)
    wave_a = stroke_canvas(size, WAVE_A, 3, 204)
    wave_b = stroke_canvas(size, WAVE_B, 2, 110)
    radius = size // 5
    for y in range(size):
        raw.append(0)
        for x in range(size):
            in_corner = (x < radius and y < radius and (radius - x) ** 2 + (radius - y) ** 2 > radius ** 2)
            in_corner = in_corner or (
                x >= size - radius and y < radius and (x - (size - radius - 1)) ** 2 + (radius - y) ** 2 > radius ** 2
            )
            index = y * size + x
            t = (x + y) / (2.0 * size)
            if t < 0.5:
                color = lerp(NAVY_TOP, NAVY_MID, t * 2)
            else:
                color = lerp(NAVY_MID, NAVY_END, (t - 0.5) * 2)
            hx, hy = (x - size * 0.18) / size, (y - size * 0.10) / size
            haze = max(0.0, 1.0 - (hx * hx + hy * hy) ** 0.5 / 0.9)
            if haze > 0:
                haze = haze ** 1.6 * 0.42
                color = blend_over(color, ACCENT, ACCENT, int(haze * 255))
            if wave_a[index]:
                color = blend_over(color, ACCENT, ACCENT, 225)
            if wave_b[index]:
                color = blend_over(color, TEAL, TEAL, 140)
            if glyph[index]:
                color = (233, 237, 252)
            if in_corner and not glyph[index]:
                color = (7, 10, 27)
            raw += bytes(color)
        raw += b"\x00" * row_padding

    header = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    content = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + chunk(b"IEND", b"")
    )
    Path(path).write_bytes(content)


GLYPH_STROKE = [
    (150, 108), (150, 366), (255, 366),
    (255, 366), (255, 108),
    (412, 108), (258, 108), (258, 244), (412, 244), (412, 366), (258, 366),
]
WAVE_A = bezier((-20, 330), (120, 260), (220, 400), (380, 310)) + bezier((380, 310), (540, 220), (520, 250), (540, 290))[1:]
WAVE_B = bezier((-20, 380), (130, 320), (240, 450), (400, 365)) + bezier((400, 365), (560, 280), (520, 320), (540, 345))[1:]


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