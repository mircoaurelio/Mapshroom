from __future__ import annotations

import math
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
CAPTURE_ROOT = ROOT / "tmp" / "marketing-tutorial-clips"
RAW_ROOT = CAPTURE_ROOT / "raw"
FRAME_ROOT = CAPTURE_ROOT / "vertical-frames"
OUTPUT_ROOT = CAPTURE_ROOT / "mp4"
STILL_ROOT = CAPTURE_ROOT / "stills"
FFMPEG = Path(r"C:\tmp\mapshroom-video-tools\node_modules\ffmpeg-static\ffmpeg.exe")

WIDTH = 1080
HEIGHT = 1920
CROP_WIDTH = 506
CROP_HEIGHT = 900
FRAME_COUNT = 50
INPUT_FPS = 10

FONT_REGULAR = ImageFont.truetype(r"C:\Windows\Fonts\segoeui.ttf", 15)
FONT_BUTTON = ImageFont.truetype(r"C:\Windows\Fonts\seguisb.ttf", 13)

PROMPT = "Create a luminous chromatic wave that moves across the stage."


SCENES = [
    {"slug": "01-workspace-camera-tour", "raw": "01-workspace-tour", "x0": 170, "x1": 720},
    {"slug": "02-preset-library-tour", "raw": "02-preset-library", "x0": 210, "x1": 700},
    {"slug": "03-live-slider-tutorial", "raw": "03-slider-control", "x0": 0, "x1": 330},
    {"slug": "04-eight-shader-sequence", "raw": "04-eight-shader-sequence", "x0": 0, "x1": 520},
    {"slug": "05-prompt-typing", "raw": "01-workspace-tour", "x0": 620, "x1": 934, "prompt": "typing"},
    {"slug": "06-generate-and-apply", "raw": "01-workspace-tour", "x0": 720, "x1": 934, "prompt": "generating"},
    {"slug": "07-output-mode", "raw": "05-output-mode", "x0": 480, "x1": 934},
    {"slug": "08-code-to-stage", "raw": "01-workspace-tour", "x0": 934, "x1": 340},
]


def ease(t: float) -> float:
    return t * t * (3.0 - 2.0 * t)


def wrap_text(text: str, limit: int = 34) -> str:
    lines: list[str] = []
    current = ""
    for word in text.split():
        candidate = f"{current} {word}".strip()
        if len(candidate) > limit and current:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return "\n".join(lines[:4])


def redraw_prompt(source: Image.Image, index: int, mode: str):
    draw = ImageDraw.Draw(source)
    field = (1091, 50, 1429, 183)
    button = (1091, 191, 1429, 226)

    draw.rounded_rectangle(field, radius=3, fill=(9, 11, 12), outline=(45, 52, 52), width=1)
    if mode == "typing":
        visible_count = int(len(PROMPT) * min(1.0, index / 42.0))
        visible = PROMPT[:visible_count]
    else:
        visible = PROMPT
    draw.multiline_text((1104, 65), wrap_text(visible), font=FONT_REGULAR, fill=(218, 226, 223), spacing=6)

    generating = mode == "generating" and 8 <= index <= 44
    border = (44, 222, 169) if generating else (48, 55, 55)
    draw.rounded_rectangle(button, radius=3, fill=(9, 11, 12), outline=border, width=1)
    label = "GENERATING AND APPLYING..." if generating else "GENERATE SHADER"
    box = draw.textbbox((0, 0), label, font=FONT_BUTTON)
    tx = button[0] + (button[2] - button[0] - (box[2] - box[0])) // 2
    ty = button[1] + 9
    draw.text((tx, ty), label, font=FONT_BUTTON, fill=(228, 235, 232))

    if generating:
        pulse = 0.5 + 0.5 * math.sin(index * 0.7)
        radius = int(3 + pulse * 2)
        draw.ellipse((1110 - radius, 208 - radius, 1110 + radius, 208 + radius), fill=(44, 222, 169))


def render_frame(scene: dict, source: Image.Image, index: int) -> Image.Image:
    desktop = source.convert("RGB")
    if scene.get("prompt"):
        redraw_prompt(desktop, index, scene["prompt"])

    t = index / max(1, FRAME_COUNT - 1)
    # Brief holds at both ends make the tutorial framing easier to read.
    if t < 0.12:
        move = 0.0
    elif t > 0.88:
        move = 1.0
    else:
        move = ease((t - 0.12) / 0.76)

    x = int(round(scene["x0"] + (scene["x1"] - scene["x0"]) * move))
    x = max(0, min(desktop.width - CROP_WIDTH, x))
    crop = desktop.crop((x, 0, x + CROP_WIDTH, CROP_HEIGHT))
    return crop.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)


def render_scene(scene: dict) -> Path:
    raw_frames = sorted((RAW_ROOT / scene["raw"]).glob("frame-*.png"))
    if len(raw_frames) < FRAME_COUNT:
        raise RuntimeError(f"{scene['raw']} contains only {len(raw_frames)} frames")

    scene_dir = FRAME_ROOT / scene["slug"]
    scene_dir.mkdir(parents=True, exist_ok=True)
    STILL_ROOT.mkdir(parents=True, exist_ok=True)

    for index in range(FRAME_COUNT):
        with Image.open(raw_frames[index]) as source:
            vertical = render_frame(scene, source.copy(), index)
            vertical.save(scene_dir / f"frame-{index:03d}.jpg", quality=95)
            if index == FRAME_COUNT // 2:
                vertical.save(STILL_ROOT / f"{scene['slug']}.jpg", quality=95)

    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    output = OUTPUT_ROOT / f"{scene['slug']}.mp4"
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
            "17",
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
    sheet = Image.new("RGB", (1080, 960), (0, 0, 0))
    for index, scene in enumerate(SCENES):
        with Image.open(STILL_ROOT / f"{scene['slug']}.jpg") as image:
            thumb = image.resize((270, 480), Image.Resampling.LANCZOS)
            sheet.paste(thumb, ((index % 4) * 270, (index // 4) * 480))
    output = CAPTURE_ROOT / "contact-sheet.jpg"
    sheet.save(output, quality=94)
    return output


def main():
    if not FFMPEG.exists():
        raise FileNotFoundError(f"ffmpeg was not found at {FFMPEG}")
    outputs = [render_scene(scene) for scene in SCENES]
    print(contact_sheet())
    for output in outputs:
        print(output)


if __name__ == "__main__":
    main()
