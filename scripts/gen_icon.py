#!/usr/bin/env python3
"""Generate the CopilotPulse extension icon (256x256 PNG)."""

import struct
import zlib
import math
import os

W = H = 256


def color_at(x, y, w, h):
    rx, ry = 48, 48
    margin = 4
    cx, cy = x - margin, y - margin
    rw, rh = w - 2 * margin, h - 2 * margin

    if cx < 0 or cy < 0 or cx >= rw or cy >= rh:
        return (0, 0, 0, 0)

    # Rounded corners
    corners = [
        (cx < rx and cy < ry, rx, ry),
        (cx >= rw - rx and cy < ry, rw - rx, ry),
        (cx < rx and cy >= rh - ry, rx, rh - ry),
        (cx >= rw - rx and cy >= rh - ry, rw - rx, rh - ry),
    ]
    for cond, ox, oy in corners:
        if cond and (cx - ox) ** 2 + (cy - oy) ** 2 > rx ** 2:
            return (0, 0, 0, 0)

    # Background gradient
    t = (x + y) / (w + h)
    bg_r = int(15 + t * 15)
    bg_g = int(23 + t * 18)
    bg_b = int(42 + t * 17)
    r, g, b, a = bg_r, bg_g, bg_b, 255

    # Pulse line points
    pts = [
        (32, 148), (62, 148), (78, 148), (94, 128), (110, 168),
        (128, 88), (146, 178), (162, 118), (178, 138), (194, 128),
        (210, 128), (228, 128),
    ]

    # Distance to polyline
    min_dist = 999.0
    for i in range(len(pts) - 1):
        x1, y1 = pts[i]
        x2, y2 = pts[i + 1]
        dx, dy = x2 - x1, y2 - y1
        seg_sq = dx * dx + dy * dy
        if seg_sq == 0:
            continue
        tv = max(0.0, min(1.0, ((x - x1) * dx + (y - y1) * dy) / seg_sq))
        px, py = x1 + tv * dx, y1 + tv * dy
        d = math.sqrt((x - px) ** 2 + (y - py) ** 2)
        min_dist = min(min_dist, d)

    # Pulse gradient: cyan -> purple -> pink
    tx = x / w
    if tx < 0.5:
        t2 = tx * 2
        pr = int(6 + t2 * 133)
        pg = int(182 - t2 * 90)
        pb = int(212 + t2 * 34)
    else:
        t2 = (tx - 0.5) * 2
        pr = int(139 + t2 * 97)
        pg = int(92 - t2 * 20)
        pb = int(246 - t2 * 93)

    # Glow (soft)
    if min_dist < 20:
        ga = max(0.0, (1 - min_dist / 20)) * 0.35
        r = int(r * (1 - ga) + pr * ga)
        g = int(g * (1 - ga) + pg * ga)
        b = int(b * (1 - ga) + pb * ga)

    # Main line (sharp)
    if min_dist < 3.5:
        la = max(0.0, min(1.0, (3.5 - min_dist) / 1.5))
        r = int(r * (1 - la) + pr * la)
        g = int(g * (1 - la) + pg * la)
        b = int(b * (1 - la) + pb * la)

    # Accent dot at peak (128, 88)
    dd = math.sqrt((x - 128) ** 2 + (y - 88) ** 2)
    if dd < 14:
        ga = max(0.0, (1 - dd / 14)) * 0.4
        r = int(r * (1 - ga) + 100 * ga)
        g = int(g * (1 - ga) + 180 * ga)
        b = int(b * (1 - ga) + 255 * ga)
    if dd < 8:
        dt = dd / 8
        da = max(0.0, 1 - dt) * 0.95
        dr = int(34 * (1 - dt) + 167 * dt)
        dg = int(211 * (1 - dt) + 139 * dt)
        db = int(238 * (1 - dt) + 250 * dt)
        r = int(r * (1 - da) + dr * da)
        g = int(g * (1 - da) + dg * da)
        b = int(b * (1 - da) + db * da)
    if dd < 4:
        wa = max(0.0, (1 - dd / 4)) * 0.9
        r = int(r * (1 - wa) + 255 * wa)
        g = int(g * (1 - wa) + 255 * wa)
        b = int(b * (1 - wa) + 255 * wa)

    return (max(0, min(255, r)), max(0, min(255, g)), max(0, min(255, b)), a)


def make_png(width, height):
    raw = b""
    for y in range(height):
        raw += b"\x00"
        for x in range(width):
            rv, gv, bv, av = color_at(x, y, width, height)
            raw += struct.pack("BBBB", rv, gv, bv, av)

    def chunk(ctype, data):
        c = ctype + data
        crc = zlib.crc32(c) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + c + struct.pack(">I", crc)

    compressed = zlib.compress(raw, 9)
    out = b"\x89PNG\r\n\x1a\n"
    out += chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
    out += chunk(b"IDAT", compressed)
    out += chunk(b"IEND", b"")
    return out


if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    media_dir = os.path.join(script_dir, "..", "media")
    out_path = os.path.join(media_dir, "icon.png")

    png = make_png(W, H)
    with open(out_path, "wb") as f:
        f.write(png)
    print(f"Generated {out_path}: {len(png)} bytes ({W}x{H})")
