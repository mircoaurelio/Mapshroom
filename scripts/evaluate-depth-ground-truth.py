import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import binary_dilation, sobel, zoom
from scipy.stats import spearmanr


def load_prediction(result_directory: Path, sample_id: str, representation: str) -> np.ndarray:
    if representation == "inverse":
        metrics = json.loads((result_directory / f"{sample_id}.json").read_text(encoding="utf-8"))
        width = metrics["rawOutput"]["width"]
        height = metrics["rawOutput"]["height"]
        return np.fromfile(result_directory / f"{sample_id}.f32", dtype=np.float32).reshape(height, width)
    if representation == "depth":
        return np.load(result_directory / f"{sample_id}.npy").astype(np.float32)
    raise ValueError(f"Unsupported prediction representation: {representation}")


def resize_float(values: np.ndarray, shape: tuple[int, int]) -> np.ndarray:
    if values.shape == shape:
        return values
    return zoom(values, (shape[0] / values.shape[0], shape[1] / values.shape[1]), order=1)


def align_prediction(prediction: np.ndarray, target_depth: np.ndarray, valid: np.ndarray, representation: str):
    source = prediction[valid].astype(np.float64)
    target = target_depth[valid].astype(np.float64)
    if representation == "inverse":
        target = 1.0 / np.clip(target, 1e-6, None)

    design = np.stack([source, np.ones_like(source)], axis=1)
    scale, shift = np.linalg.lstsq(design, target, rcond=None)[0]
    aligned = prediction.astype(np.float64) * scale + shift
    if representation == "inverse":
        aligned = 1.0 / np.clip(aligned, 1e-6, None)
    return aligned.astype(np.float32), float(scale), float(shift)


def depth_edge_f1(prediction: np.ndarray, target: np.ndarray, valid: np.ndarray) -> float:
    pred_disparity = 1.0 / np.clip(prediction, 1e-6, None)
    target_disparity = 1.0 / np.clip(target, 1e-6, None)
    pred_gradient = np.hypot(sobel(pred_disparity, axis=0), sobel(pred_disparity, axis=1))
    target_gradient = np.hypot(sobel(target_disparity, axis=0), sobel(target_disparity, axis=1))
    threshold_pred = np.quantile(pred_gradient[valid], 0.90)
    threshold_target = np.quantile(target_gradient[valid], 0.90)
    pred_edges = (pred_gradient >= threshold_pred) & valid
    target_edges = (target_gradient >= threshold_target) & valid
    tolerance_target = binary_dilation(target_edges, iterations=1)
    tolerance_pred = binary_dilation(pred_edges, iterations=1)
    precision = float((pred_edges & tolerance_target).sum() / max(pred_edges.sum(), 1))
    recall = float((target_edges & tolerance_pred).sum() / max(target_edges.sum(), 1))
    return 2 * precision * recall / max(precision + recall, 1e-12)


def evaluate_sample(prediction: np.ndarray, target: np.ndarray, representation: str) -> dict:
    prediction = resize_float(prediction, target.shape)
    height, width = target.shape
    crop = np.zeros_like(target, dtype=bool)
    # Standard NYU Eigen crop, scaled if a differently sized image is supplied.
    crop[
        round(height * 45 / 480):round(height * 471 / 480),
        round(width * 41 / 640):round(width * 601 / 640),
    ] = True
    valid = crop & np.isfinite(target) & (target >= 0.1) & (target <= 10.0) & np.isfinite(prediction)
    aligned, scale, shift = align_prediction(prediction, target, valid, representation)
    aligned = np.clip(aligned, 0.1, 10.0)

    predicted_values = aligned[valid]
    target_values = target[valid]
    abs_rel = np.mean(np.abs(predicted_values - target_values) / target_values)
    rmse = np.sqrt(np.mean((predicted_values - target_values) ** 2))
    ratio = np.maximum(predicted_values / target_values, target_values / predicted_values)
    delta1 = np.mean(ratio < 1.25)

    stride = max(1, predicted_values.size // 50000)
    rank = spearmanr(predicted_values[::stride], target_values[::stride]).statistic
    edge_f1 = depth_edge_f1(aligned, target, valid)
    return {
        "absRel": float(abs_rel),
        "rmseMeters": float(rmse),
        "delta1": float(delta1),
        "spearman": float(rank),
        "edgeF1": float(edge_f1),
        "alignment": {"scale": scale, "shift": shift},
        "validPixels": int(valid.sum()),
    }


def main() -> None:
    if len(sys.argv) != 5:
        raise SystemExit(
            "Usage: python scripts/evaluate-depth-ground-truth.py "
            "<manifest.json> <result-directory> <inverse|depth> <report.json>"
        )

    manifest_path = Path(sys.argv[1])
    result_directory = Path(sys.argv[2])
    representation = sys.argv[3]
    report_path = Path(sys.argv[4])
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    dataset_directory = manifest_path.parent

    results = []
    for sample in manifest["samples"]:
        sample_id = sample["id"]
        prediction_suffix = ".f32" if representation == "inverse" else ".npy"
        if not (result_directory / f"{sample_id}{prediction_suffix}").exists():
            print(f"{sample_id} skipped (prediction not found)")
            continue
        target = np.load(dataset_directory / sample["depth"]).astype(np.float32)
        prediction = load_prediction(result_directory, sample_id, representation)
        metrics = evaluate_sample(prediction, target, representation)
        metrics["id"] = sample_id
        results.append(metrics)
        print(
            f"{sample_id} absRel={metrics['absRel']:.4f} "
            f"delta1={metrics['delta1']:.4f} edgeF1={metrics['edgeF1']:.4f}"
        )

    metric_names = ["absRel", "rmseMeters", "delta1", "spearman", "edgeF1"]
    aggregate = {
        name: {
            "mean": float(np.mean([item[name] for item in results])),
            "median": float(np.median([item[name] for item in results])),
        }
        for name in metric_names
    }
    report = {
        "dataset": manifest["dataset"],
        "representation": representation,
        "alignment": "least-squares scale and shift per image",
        "crop": "NYU Eigen crop",
        "aggregate": aggregate,
        "results": results,
    }
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(aggregate, indent=2))
    print(f"saved {report_path}")


if __name__ == "__main__":
    main()
