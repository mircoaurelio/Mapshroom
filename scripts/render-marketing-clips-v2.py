from __future__ import annotations

import math
import subprocess
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
CAPTURE_ROOT = ROOT / "tmp" / "marketing-tutorial-clips-v2"
RAW_ROOT = CAPTURE_ROOT / "raw"
FRAME_ROOT = CAPTURE_ROOT / "vertical-frames"
OUTPUT_ROOT = CAPTURE_ROOT / "mp4"
STILL_ROOT = CAPTURE_ROOT / "stills"
FFMPEG = Path(r"C:\tmp\mapshroom-video-tools\node_modules\ffmpeg-static\ffmpeg.exe")

WIDTH = 2160
HEIGHT = 3840
FRAME_COUNT = 50
INPUT_FPS = 10


SCENES = [
    {
        "slug": "01-live-stage-overview",
        "parts": [("01-live-stage-overview", 0, None)],
        "start": (450, 570, 1440),
        "end": (1420, 720, 1360),
        "settle": (18, -8),
    },
    {
        "slug": "02-eight-shader-timeline",
        "parts": [("02-eight-shader-timeline", 0, None)],
        "start": (2060, 600, 1420),
        "end": (1280, 1010, 1220),
        "settle": (-14, -12),
    },
    {
        "slug": "03-live-shader-controls",
        "parts": [("03-live-shader-controls", 0, None)],
        "start": (1440, 720, 1440),
        "end": (360, 510, 1240),
        "settle": (13, 8),
    },
    {
        "slug": "04-prompt-typing",
        "parts": [("04-prompt-typing", 0, None)],
        "start": (1260, 820, 1440),
        "end": (2200, 360, 1120),
        "settle": (-12, 9),
    },
    {
        "slug": "05-preset-gallery",
        "parts": [("05-preset-gallery", 0, None)],
        "start": (700, 680, 1440),
        "end": (1320, 720, 1340),
        "settle": (9, -10),
    },
    {
        "slug": "06-expanded-code-editor",
        "parts": [("06-expanded-code-editor", 0, None)],
        "start": (500, 760, 1440),
        "end": (1580, 760, 1260),
        "settle": (-10, 7),
    },
    {
        "slug": "07-stage-2a-asset-selection",
        "parts": [("07-stage-2a-library", 0, None)],
        "start": (2060, 700, 1440),
        "end": (1170, 660, 1280),
        "settle": (12, 8),
    },
    {
        "slug": "08-stage-2a-remove-background",
        "parts": [
            ("08-remove-background-loading", 0, 12),
            ("08-remove-background-slider", 0, 34),
            ("08-remove-background-finalize", 0, 10),
            ("08-remove-background-result", 12, None),
        ],
        "start": (640, 730, 1440),
        "end": (1350, 730, 1290),
        "settle": (-11, -7),
    },
    {
        "slug": "09-stage-2a-depth-map",
        "parts": [
            ("09-depth-loading", 0, 10),
            ("09-depth-generating", 0, 28),
            ("09-depth-result", 8, None),
            ("09-depth-finalize", 0, 8),
            ("09-depth-library-result", 10, None),
        ],
        "start": (2100, 620, 1440),
        "end": (1330, 730, 1270),
        "settle": (10, -8),
    },
    {
        "slug": "10-clean-stage-output",
        "parts": [("10-clean-stage-output", 0, None)],
        "start": (420, 750, 1440),
        "end": (1500, 720, 1400),
        "settle": (-9, 6),
    },
]


def ease_out_cubic(t: float) -> float:
    return 1.0 - (1.0 - t) ** 3


def source_frames(parts: list[tuple[str, int, int | None]]) -> list[Path]:
    frames: list[Path] = []
    for folder, start, stop in parts:
        available = sorted((RAW_ROOT / folder).glob("frame-*.png"))
        if not available:
            raise RuntimeError(f"No frames found in {folder}")
        frames.extend(available[start:stop])
    if not frames:
        raise RuntimeError(f"No usable frames in {parts}")
    return frames


def crop_vertical(source: Image.Image, center_x: float, center_y: float, crop_h: float) -> Image.Image:
    crop_h = min(float(source.height), max(900.0, crop_h))
    crop_w = crop_h * 9.0 / 16.0
    half_w = crop_w / 2.0
    half_h = crop_h / 2.0
    center_x = min(source.width - half_w, max(half_w, center_x))
    center_y = min(source.height - half_h, max(half_h, center_y))
    box = (
        int(round(center_x - half_w)),
        int(round(center_y - half_h)),
        int(round(center_x + half_w)),
        int(round(center_y + half_h)),
    )
    return source.crop(box).resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)


def camera(scene: dict, index: int) -> tuple[float, float, float]:
    t = index / max(1, FRAME_COUNT - 1)
    # The move completes quickly, then the camera rests on the relevant control.
    move = ease_out_cubic(min(1.0, t / 0.22))
    sx, sy, sh = scene["start"]
    ex, ey, eh = scene["end"]
    x = sx + (ex - sx) * move
    y = sy + (ey - sy) * move
    h = sh + (eh - sh) * move
    if t > 0.22:
        rest = (t - 0.22) / 0.78
        decay = math.exp(-5.0 * rest)
        wobble = math.sin(rest * math.pi * 2.0) * decay
        dx, dy = scene["settle"]
        x += dx * wobble
        y += dy * wobble
        h -= 8.0 * wobble
    return x, y, h


def render_scene(scene: dict) -> Path:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    output = OUTPUT_ROOT / f"{scene['slug']}.mp4"
    if output.exists() and output.stat().st_size > 100_000:
        return output

    raw = source_frames(scene["parts"])
    scene_dir = FRAME_ROOT / scene["slug"]
    scene_dir.mkdir(parents=True, exist_ok=True)
    STILL_ROOT.mkdir(parents=True, exist_ok=True)

    for index in range(FRAME_COUNT):
        raw_index = round(index * (len(raw) - 1) / max(1, FRAME_COUNT - 1))
        with Image.open(raw[raw_index]) as source:
            x, y, h = camera(scene, index)
            vertical = crop_vertical(source.convert("RGB"), x, y, h)
            vertical.save(scene_dir / f"frame-{index:03d}.jpg", quality=96, subsampling=0)
            if index == 38:
                vertical.save(STILL_ROOT / f"{scene['slug']}.jpg", quality=96, subsampling=0)

    subprocess.run(
        [
            str(FFMPEG),
            "-y",
            "-framerate",
            str(INPUT_FPS),
            "-i",
            str(scene_dir / "frame-%03d.jpg"),
            "-t",
            "5",
            "-r",
            "30",
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "14",
            "-profile:v",
            "high",
            "-level",
            "5.2",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            "-an",
            str(output),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return output


def contact_sheet() -> Path:
    sheet = Image.new("RGB", (1350, 960), (0, 0, 0))
    for index, scene in enumerate(SCENES):
        with Image.open(STILL_ROOT / f"{scene['slug']}.jpg") as still:
            thumb = still.resize((270, 480), Image.Resampling.LANCZOS)
            sheet.paste(thumb, ((index % 5) * 270, (index // 5) * 480))
    output = CAPTURE_ROOT / "contact-sheet.jpg"
    sheet.save(output, quality=95, subsampling=0)
    return output


def main() -> None:
    if not FFMPEG.exists():
        raise FileNotFoundError(f"ffmpeg not found at {FFMPEG}")
    outputs = [render_scene(scene) for scene in SCENES]
    print(contact_sheet())
    for output in outputs:
        print(output)


if __name__ == "__main__":
    main()
