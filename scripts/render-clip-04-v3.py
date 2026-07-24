from __future__ import annotations

import math
import subprocess
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
CAPTURE = ROOT / "tmp" / "marketing-tutorial-clips-v3" / "04"
RAW = CAPTURE / "raw"
PROMPT_RAW = ROOT / "tmp" / "marketing-tutorial-clips-v2" / "raw" / "04-prompt-typing"
FRAMES = CAPTURE / "vertical-frames"
OUTPUT = CAPTURE / "04-default-stage-prompt-enterprise.mp4"
STILL = CAPTURE / "04-default-stage-prompt-enterprise.jpg"
FFMPEG = Path(r"C:\tmp\mapshroom-video-tools\node_modules\ffmpeg-static\ffmpeg.exe")

WIDTH = 1080
HEIGHT = 1920
FRAME_COUNT = 60
PROMPT = "Create an elegant cinematic light sweep across the stage"
PROMPT_FONT = ImageFont.truetype(r"C:\Windows\Fonts\segoeui.ttf", 18)


def ease_out_quint(t: float) -> float:
    return 1.0 - (1.0 - t) ** 5


def camera(index: int) -> tuple[float, float, float]:
    t = index / (FRAME_COUNT - 1)
    move_t = min(1.0, t / 0.18)
    move = ease_out_quint(move_t)

    start_x, start_y, start_h = 1650.0, 720.0, 1440.0
    end_x, end_y, end_h = 2250.0, 550.0, 1100.0
    x = start_x + (end_x - start_x) * move
    y = start_y + (end_y - start_y) * move
    h = start_h + (end_h - start_h) * move

    # A tiny damped overshoot makes the push feel deliberate, then fully settles.
    if t >= 0.18:
        rest = (t - 0.18) / 0.82
        overshoot = math.sin(rest * math.pi * 2.0) * math.exp(-7.0 * rest)
        x += 14.0 * overshoot
        y -= 7.0 * overshoot
        h -= 10.0 * overshoot
    return x, y, h


def crop_vertical(source: Image.Image, center_x: float, center_y: float, crop_h: float) -> Image.Image:
    crop_w = crop_h * 9.0 / 16.0
    half_w = crop_w / 2.0
    half_h = crop_h / 2.0
    center_x = min(source.width - half_w, max(half_w, center_x))
    center_y = min(source.height - half_h, max(half_h, center_y))
    box = (
        round(center_x - half_w),
        round(center_y - half_h),
        round(center_x + half_w),
        round(center_y + half_h),
    )
    return source.crop(box).resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)


def main() -> None:
    raw_frames = sorted(RAW.glob("frame-*.png"))
    prompt_frames = sorted(PROMPT_RAW.glob("frame-*.png"))
    if len(raw_frames) != FRAME_COUNT:
        raise RuntimeError(f"Expected {FRAME_COUNT} source frames, found {len(raw_frames)}")
    if not prompt_frames:
        raise RuntimeError("The recorded prompt animation is missing")

    FRAMES.mkdir(parents=True, exist_ok=True)
    for index, raw_path in enumerate(raw_frames):
        with Image.open(raw_path) as source:
            desktop = source.convert("RGB")
            prompt_index = len(prompt_frames) - 1
            with Image.open(prompt_frames[prompt_index]) as prompt_source:
                prompt_desktop = prompt_source.convert("RGB")
                if prompt_desktop.size != desktop.size:
                    prompt_desktop = prompt_desktop.resize(desktop.size, Image.Resampling.LANCZOS)
                # Preserve the real app's recorded prompt/code inspector while the
                # live Default Stage continues animating in the main workspace.
                panel_left = 2180
                desktop.paste(
                    prompt_desktop.crop((panel_left, 0, desktop.width, desktop.height)),
                    (panel_left, 0),
                )
            draw = ImageDraw.Draw(desktop)
            field = (2180, 49, 2549, 181)
            draw.rounded_rectangle(field, radius=4, fill=(9, 11, 12), outline=(45, 52, 52), width=1)
            visible_count = min(len(PROMPT), math.floor(index * len(PROMPT) / 47))
            visible_prompt = PROMPT[:visible_count]
            wrapped_prompt = "\n".join(textwrap.wrap(visible_prompt, width=26)[:3])
            draw.multiline_text(
                (2194, 64),
                wrapped_prompt,
                font=PROMPT_FONT,
                fill=(224, 230, 228),
                spacing=7,
            )
            x, y, h = camera(index)
            frame = crop_vertical(desktop, x, y, h)
            if index < 8:
                blur = 1.8 * (1.0 - index / 8.0)
                frame = frame.filter(ImageFilter.GaussianBlur(blur))
            frame.save(FRAMES / f"frame-{index:03d}.jpg", quality=96, subsampling=0)
            if index == 54:
                frame.save(STILL, quality=96, subsampling=0)

    subprocess.run(
        [
            str(FFMPEG),
            "-y",
            "-framerate",
            "12",
            "-i",
            str(FRAMES / "frame-%03d.jpg"),
            "-t",
            "5",
            "-r",
            "30",
            "-c:v",
            "libx264",
            "-preset",
            "slow",
            "-crf",
            "14",
            "-profile:v",
            "high",
            "-level",
            "4.2",
            "-pix_fmt",
            "yuv420p",
            "-tag:v",
            "avc1",
            "-movflags",
            "+faststart",
            "-an",
            str(OUTPUT),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    print(OUTPUT)


if __name__ == "__main__":
    main()
