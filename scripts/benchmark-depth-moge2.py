import json
import statistics
import sys
import time
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image


def percentile_preview(depth: np.ndarray, valid: np.ndarray) -> tuple[np.ndarray, dict]:
    selected = depth[valid & np.isfinite(depth)]
    if selected.size == 0:
        raise RuntimeError("MoGe produced no valid depth pixels")

    low, high = np.quantile(selected, [0.01, 0.99])
    normalized = np.clip((depth - low) / max(high - low, 1e-6), 0.0, 1.0)
    # Mapshroom convention: white is near, black is far.
    preview = np.where(valid, 1.0 - normalized, 0.0)
    return (preview * 255.0).round().astype(np.uint8), {
        "q01": float(low),
        "q99": float(high),
        "validRatio": float(valid.mean()),
    }


def benchmark_image(
    session: ort.InferenceSession,
    input_names: set[str],
    input_path: Path,
    output_path: Path,
    num_tokens: int,
    load_seconds: float,
) -> dict:
    image = Image.open(input_path).convert("RGB")
    image_array = np.asarray(image, dtype=np.float32) / 255.0
    tensor = np.transpose(image_array, (2, 0, 1))[None]
    feeds = {"image": tensor}
    if "num_tokens" in input_names:
        feeds["num_tokens"] = np.asarray(num_tokens, dtype=np.int64)

    inference_started = time.perf_counter()
    raw_outputs = session.run(None, feeds)
    inference_seconds = time.perf_counter() - inference_started
    outputs = dict(zip((item.name for item in session.get_outputs()), raw_outputs))

    points = np.asarray(outputs["points"], dtype=np.float32)[0]
    mask = np.asarray(outputs.get("mask", np.ones(points.shape[:3])), dtype=np.float32)[0]
    metric_scale_output = outputs.get("metric_scale", outputs.get("scale", [1.0]))
    metric_scale = float(np.asarray(metric_scale_output).reshape(-1)[0])

    # The official ONNX graph intentionally omits recover_focal_shift(). For this
    # product comparison we evaluate its affine Z channel, then percentile-normalize
    # it exactly as a relative depth map. Full metric reconstruction is a later spike.
    depth = points[..., 2] * metric_scale
    valid = mask > 0.5
    preview, range_metrics = percentile_preview(depth, valid)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(preview, mode="L").save(output_path)
    np.save(output_path.with_suffix(".npy"), depth.astype(np.float32))
    Image.fromarray((valid.astype(np.uint8) * 255), mode="L").save(
        output_path.with_name(f"{output_path.stem}-valid.png")
    )

    if "normal" in outputs:
        normal = np.asarray(outputs["normal"], dtype=np.float32)[0]
        normal_rgb = normal * np.asarray([0.5, -0.5, -0.5], dtype=np.float32) + 0.5
        normal_rgb = np.where(valid[..., None], normal_rgb, 0.0)
        normal_path = output_path.with_name(f"{output_path.stem}-normal.png")
        Image.fromarray((np.clip(normal_rgb, 0.0, 1.0) * 255).astype(np.uint8)).save(normal_path)

    metrics = {
        "inputFile": input_path.name,
        "model": "Ruicheng/moge-2-vits-normal-onnx",
        "runtime": "ONNX Runtime CPU, fp32, one thread",
        "input": {"width": image.width, "height": image.height},
        "output": {"width": int(depth.shape[1]), "height": int(depth.shape[0])},
        "numTokens": num_tokens,
        "loadSeconds": load_seconds,
        "inferenceSeconds": inference_seconds,
        "metricScale": metric_scale,
        "affineDepthRange": range_metrics,
        "outputNames": list(outputs),
    }
    metrics_path = output_path.with_suffix(".json")
    metrics_path.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
    print(
        f"{input_path.name} inference={inference_seconds:.3f}s "
        f"valid={range_metrics['validRatio']:.3f} output={image.width}x{image.height}",
        flush=True,
    )
    return metrics


def main() -> None:
    if len(sys.argv) < 4:
        raise SystemExit(
            "Usage: python scripts/benchmark-depth-moge2.py "
            "<model.onnx> <input-image-or-directory> "
            "<output-image-or-directory> [num-tokens]"
        )

    model_path = Path(sys.argv[1])
    input_path = Path(sys.argv[2])
    requested_output_path = Path(sys.argv[3])
    num_tokens = int(sys.argv[4]) if len(sys.argv) > 4 else 1200

    options = ort.SessionOptions()
    options.intra_op_num_threads = 1
    options.inter_op_num_threads = 1
    options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

    load_started = time.perf_counter()
    session = ort.InferenceSession(
        str(model_path),
        sess_options=options,
        providers=["CPUExecutionProvider"],
    )
    load_seconds = time.perf_counter() - load_started

    input_names = {item.name for item in session.get_inputs()}
    supported_suffixes = {".jpg", ".jpeg", ".png", ".webp"}
    if input_path.is_dir():
        image_paths = sorted(
            path for path in input_path.iterdir()
            if path.is_file() and path.suffix.lower() in supported_suffixes
        )
        output_directory = requested_output_path
    else:
        image_paths = [input_path]
        output_directory = requested_output_path.parent

    results = []
    for image_path in image_paths:
        output_path = (
            output_directory / f"{image_path.stem}.png"
            if input_path.is_dir()
            else requested_output_path
        )
        results.append(
            benchmark_image(
                session,
                input_names,
                image_path,
                output_path,
                num_tokens,
                load_seconds,
            )
        )

    if input_path.is_dir():
        timings = [item["inferenceSeconds"] for item in results]
        sorted_timings = sorted(timings)
        p95_index = min(len(sorted_timings) - 1, round((len(sorted_timings) - 1) * 0.95))
        summary = {
            "model": "Ruicheng/moge-2-vits-normal-onnx",
            "imageCount": len(results),
            "numTokens": num_tokens,
            "loadSeconds": load_seconds,
            "inferenceSeconds": {
                "mean": statistics.fmean(timings),
                "median": statistics.median(timings),
                "p95": sorted_timings[p95_index],
                "min": min(timings),
                "max": max(timings),
            },
            "validRatio": {
                "mean": statistics.fmean(
                    item["affineDepthRange"]["validRatio"] for item in results
                )
            },
            "results": results,
        }
        output_directory.mkdir(parents=True, exist_ok=True)
        summary_path = output_directory / "summary.json"
        summary_path.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(summary["inferenceSeconds"], indent=2))
        print(f"saved {summary_path}")


if __name__ == "__main__":
    main()
