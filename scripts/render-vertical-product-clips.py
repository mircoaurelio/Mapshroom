from __future__ import annotations

import math
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
CAPTURE_ROOT = ROOT / "tmp" / "vertical-product-clips"
RAW_ROOT = CAPTURE_ROOT / "raw"
FRAME_ROOT = CAPTURE_ROOT / "vertical-frames"
OUTPUT_ROOT = CAPTURE_ROOT / "mp4"
FFMPEG = Path(r"C:\tmp\mapshroom-video-tools\node_modules\ffmpeg-static\ffmpeg.exe")

WIDTH = 1080
HEIGHT = 1920
FRAME_COUNT = 30
FPS = 15

FONT_REGULAR = Path(r"C:\Windows\Fonts\segoeui.ttf")
FONT_SEMIBOLD = Path(r"C:\Windows\Fonts\seguisb.ttf")
FONT_BOLD = Path(r"C:\Windows\Fonts\segoeuib.ttf")

ACCENT = (57, 232, 181)
MUTED = (153, 173, 168)
INK = (238, 247, 244)


SCENES = [
    {
        "slug": "01-live-shader",
        "raw": "01-live-shader",
        "eyebrow": "REAL-TIME ENGINE",
        "title": "Live shaders.\nZero render wait.",
        "subtitle": "See every frame update directly on the desktop stage.",
        "crop_start": (190, 0, 1060, 900),
        "crop_end": (300, 70, 850, 760),
        "focus": (720, 330),
        "benefit": "GPU motion, visible as you build",
    },
    {
        "slug": "02-shader-library",
        "raw": "02-shader-library",
        "eyebrow": "FIRST-ACCESS DISCOVERY",
        "title": "Eight fresh looks.\nOne shader library.",
        "subtitle": "Open the preset browser and explore a growing visual system.",
        "crop_start": (170, 20, 1100, 860),
        "crop_end": (245, 55, 950, 790),
        "focus": (720, 510),
        "benefit": "Curated presets, ready to preview",
    },
    {
        "slug": "03-slider-control",
        "raw": "03-slider-control",
        "eyebrow": "LIVE PARAMETERS",
        "title": "Tune every variable.\nWatch it respond.",
        "subtitle": "Move a slider and the shader reacts in the same moment.",
        "crop_start": (0, 0, 980, 900),
        "crop_end": (0, 30, 770, 840),
        "focus": (175, 112),
        "benefit": "Direct, tactile creative control",
    },
    {
        "slug": "04-timeline-scrub",
        "raw": "04-timeline-scrub",
        "eyebrow": "SEQUENCE CONTROL",
        "title": "Build the timeline.\nScrub it live.",
        "subtitle": "Sequence shaders, tune transitions and inspect every beat.",
        "crop_start": (70, 260, 1230, 610),
        "crop_end": (120, 390, 1130, 490),
        "focus": (620, 625),
        "benefit": "Precise motion without leaving the canvas",
    },
    {
        "slug": "05-prompt-typing",
        "raw": "06-ai-generation",
        "eyebrow": "NATURAL-LANGUAGE DESIGN",
        "title": "Prompt the look.\nKeep the craft.",
        "subtitle": "Describe the motion you want inside the desktop workspace.",
        "crop_start": (590, 0, 850, 900),
        "crop_end": (850, 15, 590, 620),
        "focus": (1235, 105),
        "benefit": "Ideas become editable shader code",
        "typing": "Create liquid chrome waves that follow the face.",
    },
    {
        "slug": "06-ai-generation",
        "raw": "06-ai-generation",
        "eyebrow": "AI SHADER WORKFLOW",
        "title": "Generate. Compile.\nApply in context.",
        "subtitle": "Move from a written idea to a live visual without breaking flow.",
        "crop_start": (560, 0, 880, 900),
        "crop_end": (790, 15, 650, 670),
        "focus": (1240, 206),
        "benefit": "Prompt to production-ready motion",
        "state": "GENERATING SHADER",
    },
    {
        "slug": "07-asset-library",
        "raw": "07-asset-library",
        "eyebrow": "MEDIA OPERATIONS",
        "title": "One library.\nEvery source asset.",
        "subtitle": "Images, videos and generated media stay inside the project.",
        "crop_start": (70, 20, 1300, 850),
        "crop_end": (170, 65, 1100, 760),
        "focus": (380, 250),
        "benefit": "Centralized assets for faster iteration",
    },
    {
        "slug": "08-remove-background",
        "raw": "07-asset-library",
        "eyebrow": "SUBJECT EXTRACTION",
        "title": "Remove backgrounds.\nStay in Mapshroom.",
        "subtitle": "Prepare clean subjects directly from the Media Library.",
        "crop_start": (600, 0, 840, 560),
        "crop_end": (830, 45, 610, 390),
        "focus": (1180, 138),
        "benefit": "Clean inputs for projection-ready visuals",
    },
    {
        "slug": "09-depth-map",
        "raw": "07-asset-library",
        "eyebrow": "DEPTH INTELLIGENCE",
        "title": "Create depth maps.\nAdd dimensional control.",
        "subtitle": "Convert source imagery into depth-aware creative material.",
        "crop_start": (620, 0, 820, 560),
        "crop_end": (900, 45, 540, 390),
        "focus": (1292, 138),
        "benefit": "From flat image to spatial response",
    },
    {
        "slug": "10-signature-motion",
        "raw": "12-chromy-scanner",
        "eyebrow": "SIGNATURE SHADER",
        "title": "Design motion.\nMake it unmistakable.",
        "subtitle": "Combine stage animation, controls and code in one view.",
        "crop_start": (160, 0, 1120, 900),
        "crop_end": (275, 70, 890, 760),
        "focus": (720, 330),
        "benefit": "A visual system built for live impact",
    },
]


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size=size)


F_SMALL = font(FONT_SEMIBOLD, 22)
F_META = font(FONT_SEMIBOLD, 18)
F_TITLE = font(FONT_BOLD, 64)
F_SUBTITLE = font(FONT_REGULAR, 29)
F_BENEFIT = font(FONT_SEMIBOLD, 27)
F_NUMBER = font(FONT_BOLD, 21)


def ease(t: float) -> float:
    return 1.0 - (1.0 - t) ** 3


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def lerp_rect(a: tuple[int, int, int, int], b: tuple[int, int, int, int], t: float):
    return tuple(int(round(lerp(x, y, t))) for x, y in zip(a, b))


def cover(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    return ImageOps.fit(image, size, method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))


def rounded(image: Image.Image, radius: int) -> Image.Image:
    mask = Image.new("L", image.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, image.width - 1, image.height - 1), radius=radius, fill=255)
    result = image.convert("RGBA")
    result.putalpha(mask)
    return result


def gradient_overlay() -> Image.Image:
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    px = layer.load()
    for y in range(HEIGHT):
        v = y / max(1, HEIGHT - 1)
        alpha = int(175 + 45 * v)
        for x in range(WIDTH):
            px[x, y] = (2, 8, 7, alpha)
    glow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((-260, -240, 700, 730), fill=(27, 196, 144, 42))
    gd.ellipse((650, 1180, 1320, 2040), fill=(31, 113, 92, 32))
    glow = glow.filter(ImageFilter.GaussianBlur(100))
    return Image.alpha_composite(layer, glow)


GRADIENT = gradient_overlay()


def draw_wrapped(draw: ImageDraw.ImageDraw, text: str, xy: tuple[int, int], fnt, fill, spacing=8):
    x, y = xy
    for line in text.split("\n"):
        draw.text((x, y), line, font=fnt, fill=fill)
        box = draw.textbbox((x, y), line, font=fnt)
        y = box[3] + spacing
    return y


def render_frame(scene: dict, source: Image.Image, index: int, output: Path):
    t = index / max(1, FRAME_COUNT - 1)
    motion = ease(t)

    bg = cover(source.convert("RGB"), (WIDTH, HEIGHT)).filter(ImageFilter.GaussianBlur(42)).convert("RGBA")
    bg = Image.alpha_composite(bg, GRADIENT)
    draw = ImageDraw.Draw(bg, "RGBA")

    fade = min(1.0, index / 6.0)
    title_alpha = int(255 * fade)
    muted_alpha = int(235 * fade)

    draw.text((60, 62), "MAPSHROOM", font=F_SMALL, fill=(*INK, title_alpha))
    draw.text((60, 98), "PRODUCT MOTION SYSTEM  /  DESKTOP CAPTURE", font=F_META, fill=(*MUTED, muted_alpha))
    draw.rounded_rectangle((882, 58, 1020, 108), radius=25, fill=(15, 29, 26, 235), outline=(*ACCENT, 110), width=2)
    draw.text((914, 72), f"{int(scene['slug'][:2]):02d} / 10", font=F_NUMBER, fill=(*ACCENT, 255))

    draw.text((60, 165), scene["eyebrow"], font=F_SMALL, fill=(*ACCENT, title_alpha))
    title_bottom = draw_wrapped(draw, scene["title"], (60, 208), F_TITLE, (*INK, title_alpha), spacing=1)
    draw.text((60, title_bottom + 26), scene["subtitle"], font=F_SUBTITLE, fill=(*MUTED, muted_alpha))

    rect = lerp_rect(scene["crop_start"], scene["crop_end"], motion)
    x, y, w, h = rect
    x = max(0, min(source.width - 2, x))
    y = max(0, min(source.height - 2, y))
    w = max(2, min(source.width - x, w))
    h = max(2, min(source.height - y, h))
    crop = source.crop((x, y, x + w, y + h)).convert("RGB")

    if scene.get("typing"):
        prompt_left = max(0, 1090 - x)
        prompt_top = max(0, 50 - y)
        prompt_right = min(w, 1430 - x)
        prompt_bottom = min(h, 184 - y)
        if prompt_right > prompt_left and prompt_bottom > prompt_top:
            typing_draw = ImageDraw.Draw(crop)
            typing_draw.rounded_rectangle(
                (prompt_left, prompt_top, prompt_right, prompt_bottom),
                radius=5,
                fill=(9, 11, 12),
                outline=(45, 55, 53),
                width=1,
            )
            visible = scene["typing"][: int(len(scene["typing"]) * min(1.0, index / 24.0))]
            words = visible.split(" ")
            lines, current = [], ""
            for word in words:
                candidate = (current + " " + word).strip()
                if len(candidate) > 30 and current:
                    lines.append(current)
                    current = word
                else:
                    current = candidate
            if current:
                lines.append(current)
            typing_font = font(FONT_REGULAR, 17)
            typing_draw.multiline_text(
                (prompt_left + 14, prompt_top + 14),
                "\n".join(lines[:3]),
                font=typing_font,
                fill=(232, 238, 236),
                spacing=6,
            )

    max_body_w = 944
    max_body_h = 970
    scale = min(max_body_w / crop.width, max_body_h / crop.height)
    body_size = (max(2, int(crop.width * scale)), max(2, int(crop.height * scale)))
    body = crop.resize(body_size, Image.Resampling.LANCZOS)

    topbar_h = 44
    card_w = body.width + 20
    card_h = body.height + topbar_h + 16
    card = Image.new("RGBA", (card_w, card_h), (8, 12, 12, 255))
    cd = ImageDraw.Draw(card, "RGBA")
    cd.rounded_rectangle((0, 0, card_w - 1, card_h - 1), radius=26, fill=(8, 12, 12, 255), outline=(98, 130, 121, 115), width=2)
    cd.ellipse((22, 16, 34, 28), fill=(255, 102, 97, 230))
    cd.ellipse((42, 16, 54, 28), fill=(255, 197, 74, 230))
    cd.ellipse((62, 16, 74, 28), fill=(*ACCENT, 230))
    cd.text((94, 12), "MAPSHROOM — DESKTOP WORKSPACE", font=F_META, fill=(169, 188, 183, 220))
    card.alpha_composite(body.convert("RGBA"), (10, topbar_h))

    fx, fy = scene["focus"]
    mapped_x = 10 + int((fx - x) * scale)
    mapped_y = topbar_h + int((fy - y) * scale)
    if 5 < mapped_x < card_w - 5 and topbar_h < mapped_y < card_h - 5:
        pulse = 0.5 + 0.5 * math.sin(t * math.tau * 2.0)
        ring = int(24 + 13 * pulse)
        cd = ImageDraw.Draw(card, "RGBA")
        cd.ellipse((mapped_x - ring, mapped_y - ring, mapped_x + ring, mapped_y + ring), outline=(*ACCENT, int(115 - 45 * pulse)), width=3)
        cd.ellipse((mapped_x - 6, mapped_y - 6, mapped_x + 6, mapped_y + 6), fill=(*ACCENT, 240))

    card = rounded(card, 26)
    shadow = Image.new("RGBA", (card_w + 80, card_h + 80), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((40, 40, 40 + card_w, 40 + card_h), radius=28, fill=(0, 0, 0, 180))
    shadow = shadow.filter(ImageFilter.GaussianBlur(30))

    card_x = (WIDTH - card_w) // 2
    card_y = 490 if card_h > 760 else 600
    bg.alpha_composite(shadow, (card_x - 40, card_y - 20))
    bg.alpha_composite(card, (card_x, card_y))

    if scene.get("state"):
        state_y = card_y + card_h + 28
        draw.rounded_rectangle((60, state_y, 395, state_y + 54), radius=27, fill=(10, 29, 24, 245), outline=(*ACCENT, 120), width=2)
        pulse_alpha = int(155 + 100 * (0.5 + 0.5 * math.sin(t * math.tau * 2.2)))
        draw.ellipse((82, state_y + 18, 100, state_y + 36), fill=(*ACCENT, pulse_alpha))
        draw.text((116, state_y + 13), scene["state"], font=F_META, fill=(*INK, 245))

    benefit_y = max(card_y + card_h + 92, 1545)
    benefit_y = min(benefit_y, 1720)
    draw.rounded_rectangle((60, benefit_y, 1020, benefit_y + 104), radius=28, fill=(7, 19, 17, 228), outline=(74, 108, 99, 100), width=2)
    draw.rectangle((60, benefit_y + 20, 66, benefit_y + 84), fill=(*ACCENT, 255))
    draw.text((94, benefit_y + 31), scene["benefit"], font=F_BENEFIT, fill=(*INK, 245))
    draw.text((60, 1840), "DESKTOP EXPERIENCE  •  9:16 MASTER  •  2.0 SEC", font=F_META, fill=(*MUTED, 220))

    output.parent.mkdir(parents=True, exist_ok=True)
    bg.convert("RGB").save(output, quality=95)


def render_scene(scene: dict):
    raw_dir = RAW_ROOT / scene["raw"]
    raw_frames = sorted(raw_dir.glob("frame-*.png"))
    if len(raw_frames) < FRAME_COUNT:
        raise RuntimeError(f"{scene['raw']} contains only {len(raw_frames)} frames")

    scene_frames = FRAME_ROOT / scene["slug"]
    scene_frames.mkdir(parents=True, exist_ok=True)
    for index in range(FRAME_COUNT):
        with Image.open(raw_frames[index]) as source:
            render_frame(scene, source.copy(), index, scene_frames / f"frame-{index:03d}.jpg")

    output = OUTPUT_ROOT / f"{scene['slug']}.mp4"
    output.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            str(FFMPEG),
            "-y",
            "-framerate",
            str(FPS),
            "-i",
            str(scene_frames / "frame-%03d.jpg"),
            "-t",
            "2",
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


def contact_sheet(outputs: list[Path]):
    thumbs = []
    for scene in SCENES:
        frame = FRAME_ROOT / scene["slug"] / "frame-015.jpg"
        with Image.open(frame) as image:
            thumbs.append(image.resize((270, 480), Image.Resampling.LANCZOS))
    sheet = Image.new("RGB", (1350, 960), (4, 9, 8))
    for i, thumb in enumerate(thumbs):
        sheet.paste(thumb, ((i % 5) * 270, (i // 5) * 480))
    sheet.save(CAPTURE_ROOT / "contact-sheet.jpg", quality=92)


def main():
    if not FFMPEG.exists():
        raise FileNotFoundError(f"ffmpeg was not found at {FFMPEG}")
    outputs = [render_scene(scene) for scene in SCENES]
    contact_sheet(outputs)
    for output in outputs:
        print(output)


if __name__ == "__main__":
    main()
