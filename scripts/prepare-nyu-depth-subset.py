import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image


def main() -> None:
    if len(sys.argv) < 3:
        raise SystemExit(
            "Usage: python scripts/prepare-nyu-depth-subset.py "
            "<h5-directory> <output-directory> [extra-site-packages]"
        )

    input_directory = Path(sys.argv[1])
    output_directory = Path(sys.argv[2])
    if len(sys.argv) > 3:
        sys.path.insert(0, str(Path(sys.argv[3]).resolve()))

    import h5py  # Imported after the optional local site-packages path is added.

    rgb_directory = output_directory / "rgb"
    depth_directory = output_directory / "depth"
    preview_directory = output_directory / "depth-preview"
    for directory in (rgb_directory, depth_directory, preview_directory):
        directory.mkdir(parents=True, exist_ok=True)

    samples = []
    for h5_path in sorted(input_directory.glob("*.h5")):
        with h5py.File(h5_path, "r") as handle:
            rgb = np.asarray(handle["rgb"])
            if rgb.ndim == 3 and rgb.shape[0] == 3:
                rgb = np.transpose(rgb, (1, 2, 0))
            depth = np.asarray(handle["depth"], dtype=np.float32)

        sample_id = h5_path.stem
        rgb_path = rgb_directory / f"{sample_id}.png"
        depth_path = depth_directory / f"{sample_id}.npy"
        preview_path = preview_directory / f"{sample_id}.png"
        Image.fromarray(rgb.astype(np.uint8), mode="RGB").save(rgb_path)
        np.save(depth_path, depth)

        valid = np.isfinite(depth) & (depth > 0)
        low, high = np.quantile(depth[valid], [0.01, 0.99])
        normalized = np.clip((depth - low) / max(high - low, 1e-6), 0.0, 1.0)
        preview = np.where(valid, 1.0 - normalized, 0.0)
        Image.fromarray((preview * 255).round().astype(np.uint8), mode="L").save(preview_path)

        samples.append(
            {
                "id": sample_id,
                "source": h5_path.name,
                "rgb": str(rgb_path.relative_to(output_directory)).replace("\\", "/"),
                "depth": str(depth_path.relative_to(output_directory)).replace("\\", "/"),
                "width": int(rgb.shape[1]),
                "height": int(rgb.shape[0]),
                "validRatio": float(valid.mean()),
                "depthMeters": {
                    "min": float(depth[valid].min()),
                    "max": float(depth[valid].max()),
                    "q01": float(low),
                    "q99": float(high),
                },
            }
        )
        print(f"prepared {sample_id} {rgb.shape[1]}x{rgb.shape[0]}")

    manifest = {
        "dataset": "NYU Depth V2 validation",
        "source": "https://huggingface.co/datasets/sayakpaul/nyu_depth_v2",
        "sampleCount": len(samples),
        "samples": samples,
    }
    (output_directory / "manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
