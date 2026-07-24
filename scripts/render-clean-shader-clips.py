from __future__ import annotations

import subprocess
from pathlib import Path

from PIL import Image, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
CAPTURE_ROOT = ROOT / "tmp" / "clean-shader-clips"
RAW_ROOT = CAPTURE_ROOT / "raw"
FRAME_ROOT = CAPTURE_ROOT / "vertical-frames"
OUTPUT_ROOT = CAPTURE_ROOT / "mp4"
STILL_ROOT = CAPTURE_ROOT / "stills"
FFMPEG = Path(r"C:\tmp\mapshroom-video-tools\node_modules\ffmpeg-static\ffmpeg.exe")

WIDTH = 1080
HEIGHT = 1920
FRAME_COUNT = 50
INPUT_FPS = 10


SHADERS = [
    "01-distorted-chromy-hue-scanner",
    "02-festival-fluid-relief-v2",
    "03-gold-wandering-light-relief",
    "04-entrapped-in-glass",
    "05-3d-topo-glass",
    "06-alien-noise-automata",
    "07-dual-center-trippy",
    "08-animated-hura-hex-grid",
]


def compose(source: Image.Image) -> Image.Image:
    screenshot = source.convert("RGB")

    # The complete desktop screenshot is always visible in the foreground.
    foreground = screenshot.resize((WIDTH, 675), Image.Resampling.LANCZOS)

    # Empty vertical space is filled only with a blurred copy of the same
    # screenshot. No titles, labels, badges, frames, or decorative UI are added.
    background = ImageOps.fit(
        screenshot,
        (WIDTH, HEIGHT),
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.5),
    ).filter(ImageFilter.GaussianBlur(52))
    dark = Image.new("RGB", (WIDTH, HEIGHT), (0, 0, 0))
    background = Image.blend(background, dark, 0.28)

    y = (HEIGHT - foreground.height) // 2
    background.paste(foreground, (0, y))
    return background


def render_shader(slug: str) -> Path:
    raw_dir = RAW_ROOT / slug
    raw_frames = sorted(raw_dir.glob("frame-*.png"))
    if len(raw_frames) < FRAME_COUNT:
        raise RuntimeError(f"{slug} contains only {len(raw_frames)} frames")

    scene_dir = FRAME_ROOT / slug
    scene_dir.mkdir(parents=True, exist_ok=True)
    STILL_ROOT.mkdir(parents=True, exist_ok=True)

    for index in range(FRAME_COUNT):
        with Image.open(raw_frames[index]) as source:
            vertical = compose(source)
            vertical.save(scene_dir / f"frame-{index:03d}.jpg", quality=94)
            if index == FRAME_COUNT // 2:
                source.convert("RGB").save(STILL_ROOT / f"{slug}.png")

    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    output = OUTPUT_ROOT / f"{slug}.mp4"
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
            "18",
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


def make_contact_sheet() -> Path:
    sheet = Image.new("RGB", (1440, 900), (0, 0, 0))
    for index, slug in enumerate(SHADERS):
        with Image.open(STILL_ROOT / f"{slug}.png") as still:
            thumb = still.resize((360, 225), Image.Resampling.LANCZOS)
            x = (index % 4) * 360
            y = (index // 4) * 450 + 112
            sheet.paste(thumb, (x, y))
    output = CAPTURE_ROOT / "contact-sheet.jpg"
    sheet.save(output, quality=93)
    return output


def main():
    if not FFMPEG.exists():
        raise FileNotFoundError(f"ffmpeg was not found at {FFMPEG}")
    outputs = [render_shader(slug) for slug in SHADERS]
    print(make_contact_sheet())
    for output in outputs:
        print(output)


if __name__ == "__main__":
    main()
