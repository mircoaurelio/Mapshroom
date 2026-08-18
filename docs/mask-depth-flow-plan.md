# Mask, Smart Pen and depth model plan

## Goal

Make background removal and depth generation two non-destructive stages of the
same asset workflow. Users can start manually or with AI, correct either result,
and switch models without losing edits.

## Product flow

1. **Choose a starting method**
   - Manual Pen: no model download.
   - Smart Pen: prompted segmentation from positive/negative strokes.
   - AI Fast: automatic foreground matte with the current default model.
   - AI Precise: optional larger matting model.
2. **Refine one canonical alpha mask**
   - Erase and Restore are modes of the same tool.
   - Smart Pen consumes the current alpha and proposes a patch, never replacing
     the whole mask silently.
   - Every proposal has Preview, Apply and Cancel.
3. **Choose a depth source**
   - Fast: Depth Anything V2 Small.
   - Geometry: MoGe-2 ViT-S if its browser spike passes.
   - LiDAR: PromptDA when sparse/metric device depth is available.
4. **Refine depth independently**
   - Keep raw float depth and a confidence/validity map.
   - Add Near, Far, Smooth and Restore brushes later; do not reuse alpha strokes
     as depth values.
5. **Export linked derivatives**
   - Original RGB remains immutable.
   - Alpha mask, RGBA composite, raw depth, depth preview and model metadata are
     stored as related outputs of the source asset.

## Required internal contract

```ts
type AnalysisArtifact = {
  sourceAssetId: string;
  kind: 'alpha' | 'depth' | 'confidence' | 'normal';
  width: number;
  height: number;
  dataType: 'u8' | 'u16' | 'f32';
  modelId: string | null;
  modelVersion: string | null;
  processingMs: number;
};
```

The model adapter returns raw data only. Normalization, masking, preview colors
and export belong to shared post-processing so every model is compared fairly.

## Corrections to the current pipeline

- Send the original RGB to the depth model; apply alpha after inference.
- Preserve `predicted_depth` as float32 instead of using only the generated
  8-bit preview.
- Resize depth with bicubic/bilateral-aware interpolation rather than nearest
  neighbor sampling.
- Normalize depth using valid foreground percentiles and keep that normalization
  reversible in metadata.
- Default Definition close to zero. Sharpen only the preview or as an explicit
  non-destructive adjustment.
- Load one large worker model at a time and dispose it before switching model
  families on memory-constrained devices.

## Benchmark gate

Use the same immutable RGB input and the same shared post-processing for every
model. Record cold load, warm inference, output resolution, model bytes, peak
memory when available and failure state.

Depth metrics with ground truth:

- AbsRel and RMSE after the alignment appropriate to relative or metric depth.
- Edge F1 around ground-truth depth discontinuities.
- Foreground boundary error after applying the same alpha.
- A visual projection test using one fixed displacement shader.

Mask metrics with ground truth:

- IoU for the solid foreground.
- SAD/MAD for soft alpha.
- Boundary F-score and error bands at 1, 2 and 4 pixels.
- Number of corrective strokes and seconds required to reach an acceptable mask.

Initial sources:

- DIODE validation subset for RGB plus measured indoor/outdoor depth.
- P3M-10k validation images for portrait alpha mattes.
- DIS5K test images for intricate objects, subject to its dataset terms.
- A small Mapshroom set for sculpture, painting, hair, transparent material and
  thin structures. These images remain the product acceptance set.

## Candidate gate

| Candidate | Purpose | First gate |
| --- | --- | --- |
| Depth Anything V2 Small | Current fast baseline | Keep if warm CPU remains acceptable |
| MoGe-2 ViT-S Normal | Geometry candidate | Official ONNX must run in ORT Web and fit memory budget |
| Depth Anything 3 Small | Experimental quality candidate | Defer until a validated browser export exists |
| PromptDA | LiDAR-assisted depth | Enable only when compatible sensor depth is present |

No model becomes the default from one attractive preview. It must win on the
acceptance set without exceeding the agreed device budget.

## Rollout order

1. Extract alpha state, history and rendering from `segmentation/main.js` into a
   canonical mask document and adapter boundary.
2. Merge Pencil, Smart Erase and AI Magic Wand into Manual Pen and Smart Pen UX.
3. Fix the current DA2 input/output pipeline and establish baseline metrics.
4. Add MoGe-2 as a benchmark-only adapter and test WASM/WebGPU compatibility.
5. Compare on the acceptance set; ship the winner behind an experimental model
   selector.
6. Add PromptDA as a separate LiDAR path rather than treating it as another RGB
   model.
