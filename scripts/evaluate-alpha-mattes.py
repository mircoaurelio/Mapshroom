import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import binary_dilation


def resize_mask(values: np.ndarray, shape: tuple[int, int]) -> np.ndarray:
    if values.shape == shape:
        return values
    image = Image.fromarray((np.clip(values, 0, 1) * 255).astype(np.uint8), mode="L")
    return np.asarray(image.resize((shape[1], shape[0]), Image.Resampling.BILINEAR), dtype=np.float32) / 255.0


def boundary_f1(prediction: np.ndarray, target: np.ndarray) -> float:
    prediction_binary = prediction >= 0.5
    target_binary = target >= 0.5
    pred_boundary = prediction_binary ^ binary_dilation(prediction_binary, iterations=1)
    target_boundary = target_binary ^ binary_dilation(target_binary, iterations=1)
    target_tolerance = binary_dilation(target_boundary, iterations=2)
    pred_tolerance = binary_dilation(pred_boundary, iterations=2)
    precision = float((pred_boundary & target_tolerance).sum() / max(pred_boundary.sum(), 1))
    recall = float((target_boundary & pred_tolerance).sum() / max(target_boundary.sum(), 1))
    return 2 * precision * recall / max(precision + recall, 1e-12)


def main() -> None:
    if len(sys.argv) != 4:
        raise SystemExit(
            "Usage: python scripts/evaluate-alpha-mattes.py "
            "<manifest.json> <prediction-directory> <report.json>"
        )

    manifest_path = Path(sys.argv[1])
    prediction_directory = Path(sys.argv[2])
    report_path = Path(sys.argv[3])
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    root = manifest_path.parent
    results = []
    for sample in manifest["samples"]:
        sample_id = sample["id"]
        prediction_path = prediction_directory / f"{sample_id}-alpha.png"
        if not prediction_path.exists():
            print(f"{sample_id} skipped")
            continue
        target = np.asarray(Image.open(root / sample["mask"]).convert("L"), dtype=np.float32) / 255.0
        prediction = np.asarray(Image.open(prediction_path).convert("L"), dtype=np.float32) / 255.0
        prediction = resize_mask(prediction, target.shape)
        target_binary = target >= 0.5
        prediction_binary = prediction >= 0.5
        intersection = (target_binary & prediction_binary).sum()
        union = (target_binary | prediction_binary).sum()
        mae = np.mean(np.abs(prediction - target))
        result = {
            "id": sample_id,
            "iou": float(intersection / max(union, 1)),
            "mae": float(mae),
            "sadPerMegapixel": float(np.abs(prediction - target).sum() / prediction.size),
            "boundaryF1": boundary_f1(prediction, target),
        }
        results.append(result)
        print(
            f"{sample_id} iou={result['iou']:.4f} mae={result['mae']:.4f} "
            f"boundaryF1={result['boundaryF1']:.4f}"
        )

    metrics = ["iou", "mae", "sadPerMegapixel", "boundaryF1"]
    aggregate = {
        metric: {
            "mean": float(np.mean([result[metric] for result in results])),
            "median": float(np.median([result[metric] for result in results])),
        }
        for metric in metrics
    }
    report = {
        "dataset": manifest["dataset"],
        "split": manifest["split"],
        "sampleCount": len(results),
        "aggregate": aggregate,
        "results": results,
    }
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(aggregate, indent=2))
    print(f"saved {report_path}")


if __name__ == "__main__":
    main()
