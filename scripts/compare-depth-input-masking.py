import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import binary_erosion, distance_transform_edt, zoom
from scipy.stats import spearmanr


def load_da2(path: Path) -> np.ndarray:
    metadata = json.loads(path.with_suffix(".json").read_text(encoding="utf-8"))
    width = metadata["rawOutput"]["width"]
    height = metadata["rawOutput"]["height"]
    return np.fromfile(path, dtype=np.float32).reshape(height, width)


def load_prediction(path: Path) -> np.ndarray:
    if path.suffix == ".f32":
        return load_da2(path)
    if path.suffix == ".npy":
        return np.load(path).astype(np.float32)
    raise ValueError(f"Unsupported prediction file: {path}")


def resize_float(values: np.ndarray, shape: tuple[int, int]) -> np.ndarray:
    if values.shape == shape:
        return values
    return zoom(values, (shape[0] / values.shape[0], shape[1] / values.shape[1]), order=1)


def main() -> None:
    if len(sys.argv) != 5:
        raise SystemExit(
            "Usage: python scripts/compare-depth-input-masking.py "
            "<original-prediction> <black-masked-prediction> <alpha-mask> <report.json>"
        )

    original_path = Path(sys.argv[1])
    masked_path = Path(sys.argv[2])
    alpha_path = Path(sys.argv[3])
    report_path = Path(sys.argv[4])
    alpha = np.asarray(Image.open(alpha_path).convert("L")) >= 128
    original = resize_float(load_prediction(original_path), alpha.shape)
    masked = resize_float(load_prediction(masked_path), alpha.shape)

    valid = binary_erosion(alpha, iterations=3) & np.isfinite(original) & np.isfinite(masked)
    source = masked[valid].astype(np.float64)
    target = original[valid].astype(np.float64)
    design = np.stack([source, np.ones_like(source)], axis=1)
    scale, shift = np.linalg.lstsq(design, target, rcond=None)[0]
    aligned = masked * scale + shift

    low, high = np.quantile(original[valid], [0.01, 0.99])
    normalized_difference = np.abs(aligned - original) / max(high - low, 1e-6)
    distance = distance_transform_edt(alpha)
    boundary = valid & (distance <= 12)
    interior = valid & (distance > 24)
    sample_stride = max(1, valid.sum() // 50000)
    rank = spearmanr(aligned[valid][::sample_stride], original[valid][::sample_stride]).statistic

    report = {
        "originalPrediction": str(original_path),
        "maskedPrediction": str(masked_path),
        "alphaCoverage": float(alpha.mean()),
        "alignment": {"scale": float(scale), "shift": float(shift)},
        "subjectDifference": {
            "normalizedMae": float(normalized_difference[valid].mean()),
            "normalizedRmse": float(np.sqrt(np.mean(normalized_difference[valid] ** 2))),
            "spearman": float(rank),
            "boundaryMae": float(normalized_difference[boundary].mean()),
            "interiorMae": float(normalized_difference[interior].mean()),
        },
    }
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    print(f"saved {report_path}")


if __name__ == "__main__":
    main()
