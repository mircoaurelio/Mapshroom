# Depth benchmark spike — 2026-08-04

## Scope

This is a feasibility run, not a model-selection verdict. Both models received
the same original 1020 × 768 RGB image, `06_MaitreyaBuddha.png`, from the official
Microsoft MoGe example set. No foreground mask was applied before inference.

Test machine: Intel Core Ultra 7 255U, one CPU inference thread.

## Results

| Model | Format | Load | Inference | Extra outputs |
| --- | --- | ---: | ---: | --- |
| Depth Anything V2 Small | q8 via Transformers.js | 0.41 s warm | 1.15 s | relative depth |
| MoGe-2 ViT-S Normal | official FP32 ONNX, 141 MB | 1.23 s | 5.69 s | affine points, normals, validity mask, scale |

MoGe used 1,200 tokens, the low end of its documented suggested range. Increasing
tokens should improve fine detail but will also increase latency.

## Visual read

- DA2 is the clear speed baseline and produces a usable continuous depth map.
- MoGe separates large geometric planes cleanly and its normal map retains useful
  surface orientation that a single grayscale map cannot express.
- The MoGe validity mask excludes sky and uncertain regions, but it is not a
  foreground-removal mask and must not replace the alpha model.
- A single visually attractive result cannot establish accuracy. The source has
  no ground-truth depth, and the two raw output representations are different.

## Fairness rules for the next run

1. Keep the source RGB immutable and apply the same alpha only after inference.
2. Preserve each model's float output.
3. Use one percentile normalization implementation for both previews.
4. Evaluate RGB-to-depth edge alignment and ground-truth depth separately; edge
   alignment alone can reward unwanted texture leakage.
5. Repeat cold and warm runs in the actual browser with WASM and WebGPU.
6. Run at least five product cases plus a DIODE validation subset before choosing
   a default.

## Reproduction

```powershell
node scripts/benchmark-depth-da2.mjs `
  tmp/depth-benchmark/input/maitreya-buddha.png `
  tmp/depth-benchmark/output/da2-v2-small.png

python scripts/benchmark-depth-moge2.py `
  tmp/depth-benchmark/models/moge-2-vits-normal.onnx `
  tmp/depth-benchmark/input/maitreya-buddha.png `
  tmp/depth-benchmark/output/moge2-vits.png `
  1200
```

The model and generated artifacts remain under ignored `tmp/`; the reproducible
runners and this report are versionable.
