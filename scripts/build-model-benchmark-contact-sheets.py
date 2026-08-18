#!/usr/bin/env python3
"""Build compact visual summaries from the local benchmark outputs."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


def font(size: int) -> ImageFont.ImageFont:
    candidates = (
        Path("C:/Windows/Fonts/segoeui.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
    )
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


LABEL_FONT = font(20)
ID_FONT = font(17)


def tile(path: Path, size: tuple[int, int], grayscale: bool = False) -> Image.Image:
    if not path.exists():
        image = Image.new("RGB", size, "#5b1f2b")
        draw = ImageDraw.Draw(image)
        draw.text((12, 12), f"missing\n{path.name}", font=ID_FONT, fill="white")
        return image
    image = Image.open(path)
    if grayscale:
        image = image.convert("L").convert("RGB")
    else:
        image = image.convert("RGB")
    return ImageOps.pad(image, size, method=Image.Resampling.LANCZOS, color="#17191d")


def contact_sheet(
    rows: list[tuple[str, list[tuple[Path, bool]]]],
    labels: list[str],
    output: Path,
    tile_size: tuple[int, int],
) -> None:
    label_height = 42
    row_gap = 12
    left = 74
    width = left + len(labels) * tile_size[0]
    height = label_height + len(rows) * (tile_size[1] + row_gap) - row_gap
    sheet = Image.new("RGB", (width, height), "#0e1013")
    draw = ImageDraw.Draw(sheet)
    for column, label in enumerate(labels):
        x = left + column * tile_size[0]
        draw.text((x + 10, 9), label, font=LABEL_FONT, fill="#f4f4f5")
    for row_index, (row_id, cells) in enumerate(rows):
        y = label_height + row_index * (tile_size[1] + row_gap)
        draw.text((10, y + 10), row_id, font=ID_FONT, fill="#c9cbd1")
        for column, (path, grayscale) in enumerate(cells):
            sheet.paste(tile(path, tile_size, grayscale), (left + column * tile_size[0], y))
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output, quality=94)


def build_mask_sheet(root: Path, output: Path) -> None:
    dataset = root / "tmp/mask-benchmark/p3m-500-p"
    results = root / "tmp/mask-benchmark/results"
    ids = ("00000", "00001", "00006", "00008", "00009")
    rows = []
    for sample_id in ids:
        rows.append(
            (
                sample_id,
                [
                    (dataset / f"rgb/{sample_id}.jpg", False),
                    (dataset / f"mask/{sample_id}.jpg", True),
                    (results / f"ormbg-q4/{sample_id}-alpha.png", True),
                    (results / f"ormbg-q8/{sample_id}-alpha.png", True),
                    (results / f"modnet-q4/{sample_id}-alpha.png", True),
                    (results / f"birefnet-lite-fp32/{sample_id}-alpha.png", True),
                    (results / f"slimsam-q8/{sample_id}-alpha.png", True),
                ],
            )
        )
    contact_sheet(
        rows,
        ["Original", "Ground truth", "ORMBG q4", "ORMBG q8", "MODNet q4", "BiRefNet", "SlimSAM 1-click"],
        output,
        (220, 280),
    )


def build_depth_sheet(root: Path, output: Path) -> None:
    dataset = root / "tmp/depth-benchmark/nyu-subset"
    results = root / "tmp/depth-benchmark/nyu-results"
    ids = ("00001", "00009", "00015", "00016")
    rows = []
    for sample_id in ids:
        rows.append(
            (
                sample_id,
                [
                    (dataset / f"rgb/{sample_id}.png", False),
                    (dataset / f"depth-preview/{sample_id}.png", False),
                    (results / f"da2-v2-small/{sample_id}.png", False),
                    (results / f"moge2-vits-t1200/{sample_id}.png", False),
                    (results / f"moge2-vits-t1200/{sample_id}-normal.png", False),
                ],
            )
        )
    contact_sheet(
        rows,
        ["Original", "Ground truth", "Depth Anything V2", "MoGe-2 depth", "MoGe-2 normals"],
        output,
        (320, 240),
    )


def build_alpha_flow_sheet(root: Path, output: Path) -> None:
    alpha = root / "tmp/depth-benchmark/alpha-test"
    source = root / "tmp/moge-reference/example_images/04_BunnyCake.jpg"
    suite = root / "tmp/depth-benchmark/suite"
    rows = [
        (
            "Bunny",
            [
                (source, False),
                (alpha / "bunny-alpha.png", True),
                (alpha / "bunny-masked-rgb.png", False),
                (suite / "da2-v2-small/04_BunnyCake.png", False),
                (alpha / "da2-bunny-masked.png", False),
                (suite / "moge2-vits-t1200/04_BunnyCake.png", False),
                (alpha / "moge-bunny-masked.png", False),
            ],
        )
    ]
    contact_sheet(
        rows,
        ["Original RGB", "Alpha", "Black-masked", "DA2 / RGB", "DA2 / masked", "MoGe / RGB", "MoGe / masked"],
        output,
        (220, 220),
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--output", type=Path, default=Path("tmp/benchmark-contact-sheets"))
    args = parser.parse_args()
    root = args.root.resolve()
    output = args.output if args.output.is_absolute() else root / args.output
    build_mask_sheet(root, output / "mask-models.jpg")
    build_depth_sheet(root, output / "depth-models.jpg")
    build_alpha_flow_sheet(root, output / "depth-alpha-flow.jpg")
    print(output)


if __name__ == "__main__":
    main()
