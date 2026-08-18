# Mask, Smart Pen and depth benchmark — 2026-08-04

## Executive decision

- Use **ORMBG q8** as the recommended automatic background-removal model. It is
  visually and metrically very close to the current ORMBG q4, but its ONNX file
  is about 44 MB instead of 176 MB.
- Keep **MODNet q4** only as an optional Fast mode. It is about 4.3 times faster
  than ORMBG q4 on the test CPU, but loses hair, holes and difficult boundaries.
- Do not add BiRefNet Lite or BEN2 to the normal app flow. Neither beat ORMBG
  enough to justify their latency and download/memory cost.
- Keep **SlimSAM as Smart Pen**, not as a complete automatic-removal model. Cache
  the image embedding once, accept positive and negative strokes, and apply its
  result as a previewable patch to the canonical alpha.
- Keep **Depth Anything V2 Small** as the default depth model. MoGe-2 ViT-S is a
  useful experimental Geometry mode because it also returns normals and valid
  geometry, but it was much slower and did not consistently improve depth error.
- Always infer depth from the immutable original RGB. Apply alpha only after
  inference. Black-masking the input materially changed the estimated geometry.
- Treat **PromptDA as a separate LiDAR-assisted capture path**, not as a second
  generic RGB model. It needs low-resolution metric sensor depth and does not
  currently have a ready browser adapter in the official project.

## Test setup and limitations

Machine: Intel Core Ultra 7 255U. All browser-oriented benchmarks used
Transformers.js or ONNX Runtime with one CPU/WASM thread. Absolute times will
change on WebGPU and phones; the CPU measurements are primarily useful for
ranking and sustained fallback behavior.

Mask set: 10 images from the P3M-500-P split of
[P3M-10K](https://github.com/JizhiziLi/P3M), with soft alpha ground truth. This is
a small portrait-focused subset, so it must be followed by a Mapshroom product
set containing paintings, sculptures, transparent objects and thin structures.

Depth set: 10 indoor NYU Depth V2 validation frames with measured depth. Relative
predictions were aligned per image with scale and shift inside the standard NYU
crop before calculating AbsRel, RMSE and delta metrics. This tests shape quality,
not whether an uncalibrated model returns absolute meters.

Additional depth inputs: 10 official example photos from the
[MoGe repository](https://github.com/microsoft/MoGe), plus a controlled alpha
input test on `04_BunnyCake.jpg`.

## Automatic background removal

Mean results on the same 10 P3M portraits:

| Model | Dtype / approximate file | Mean inference | IoU ↑ | Alpha MAE ↓ | Boundary F1 ↑ | Decision |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| ORMBG | q4 / 176 MB | 2.114 s | **0.9907** | 0.00588 | **0.8574** | Current quality baseline |
| ORMBG | q8 / 44 MB | 2.325 s | 0.9902 | 0.00599 | 0.8507 | **Recommended default** |
| MODNet | q4 / 23 MB | **0.490 s** | 0.9798 | 0.01009 | 0.7379 | Optional Fast mode |
| MODNet | q8 / 6.6 MB | 0.676 s | 0.7560 | 0.07413 | 0.5015 | Reject; quantization breaks quality |
| BiRefNet Lite | fp32 / 224 MB | 12.523 s | 0.9906 | **0.00505** | 0.8497 | Reject; no useful win for 6× latency |
| BEN2 | fp16 / 219 MB | 21.642 s | 0.9875* | 0.00767* | 0.7754* | Reject; too slow |

`*` BEN2 was stopped after three representative images because latency was
already outside the product budget; its quality values are not directly
comparable to the ten-image aggregate.

ORMBG q8 is only 0.0005 lower in IoU and 0.0068 lower in Boundary F1 than q4,
while reducing model bytes by roughly 75%. The current worker calls q4 the
low-memory route, but for this particular model repository q8 is the much smaller
artifact. This should be corrected.

MODNet q4 is useful when the user explicitly chooses speed, especially for a
rough mask that will be corrected manually. It should not be described as equal
quality: its worst tested portrait fell to IoU 0.9269, and the contact sheet shows
lost face/hair regions on difficult lighting.

## Smart Pen / SlimSAM

The one-click benchmark used a single positive point inside the ground-truth
foreground. The current app-like implementation recomputed the image encoder at
every click:

| Stage | Mean time |
| --- | ---: |
| Preprocess | 0.139 s |
| Full SlimSAM inference | 2.057 s |
| Post-process three masks | 0.354 s |
| **Current total per click** | **2.550 s** |

This is too slow for a tool called a pen. SlimSAM exposes separable image
embeddings, so the worker can cache them until the source image changes. On a
three-image verification run:

| Cached stage | Mean time |
| --- | ---: |
| One-time image embedding | 2.042 s |
| Prompt decoder per click | 0.129 s |
| Resize only the selected mask | 0.295 s |
| **Subsequent click cost** | **about 0.424 s** |

The single-click result is intentionally not comparable with an automatic matte.
It selects the clicked object or component: simple cases reached IoU 0.96–0.98,
while ambiguous portraits or disconnected foreground regions failed badly. The
correct role is therefore local correction:

1. Precompute the embedding when Smart Pen opens or during idle time.
2. Convert violet/positive strokes into include points and red/negative strokes
   into exclude points.
3. Choose the best low-resolution candidate before resizing it.
4. Show the proposed patch over the current alpha.
5. Apply it as Add or Remove without replacing unrelated mask regions.
6. Keep Preview, Apply, Cancel and Undo for every patch.

## Depth Anything V2 versus MoGe-2

[Depth Anything V2](https://github.com/DepthAnything/Depth-Anything-V2) is the
current fast relative-depth baseline. The tested MoGe variant was the official
35M-parameter ViT-S Normal model. MoGe can return point maps, metric depth,
normals, validity and camera information; the official repository documents
1,200–2,500 inference tokens, where more tokens preserve finer detail but cost
more time.

### Latency on 10 open-domain photos

| Model | Configuration | Mean | Median | P95 |
| --- | --- | ---: | ---: | ---: |
| Depth Anything V2 Small | q8, one WASM thread | **1.807 s** | 1.786 s | 2.455 s |
| MoGe-2 ViT-S Normal | FP32 ONNX, 1,200 tokens | 8.395 s | 6.827 s | 17.591 s |

The later NYU batch was slower for both models, consistent with sustained CPU
heating: DA2 averaged 3.138 s and MoGe 15.240 s. A browser WebGPU run on target
hardware is still required before defining UX timeouts.

### Depth quality on 10 NYU frames

| Model | AbsRel ↓ | RMSE m ↓ | δ1 ↑ | Spearman ↑ | Edge F1 ↑ |
| --- | ---: | ---: | ---: | ---: | ---: |
| Depth Anything V2 Small | **0.0523** | 0.2947 | **0.9834** | 0.9329 | **0.5608** |
| MoGe-2 ViT-S, 1,200 tokens | 0.0695 | **0.2892** | 0.9413 | **0.9585** | 0.5420 |

There is no universal winner. MoGe preserved rank ordering and RMSE slightly
better, and its normals are valuable for lighting/relief. DA2 had lower mean
relative error, higher δ1, slightly better mean edge score, and fewer bad
outliers. In corridor and shelf scenes MoGe compressed distant geometry enough
to lose the aggregate comparison.

Increasing MoGe from 1,200 to 2,500 tokens improved all three selected quality
cases, especially edges, but did not remove the structural outlier. Therefore
the quality setting should not be presented as a guaranteed repair.

Recommendation:

- `Depth — Fast/Recommended`: DA2 Small.
- `Depth — Geometry (Experimental)`: MoGe-2 ViT-S Normal only when normals or
  geometry masks are useful and the device passes a memory/performance gate.
- Do not ship Depth Pro in the browser flow.
- MoGe-3 was announced in July 2026, but its official code and pretrained models
  are still marked as coming soon, so it cannot be benchmarked or selected yet.

## Alpha must not be an input to depth

On the BunnyCake test, an ORMBG alpha was hard-applied as black RGB before depth
inference, matching the problematic pipeline behavior. Each masked prediction
was aligned back to the original prediction inside an eroded foreground region.

| Model | Normalized MAE | RMSE | Spearman | Boundary MAE | Interior MAE |
| --- | ---: | ---: | ---: | ---: | ---: |
| DA2: original RGB vs black-masked RGB | 0.0581 | 0.0816 | 0.9518 | 0.0637 | 0.0455 |
| MoGe: original RGB vs black-masked RGB | 0.1920 | 0.2323 | 0.5423 | 0.2011 | 0.1845 |

The black background is interpreted as scene evidence, not as transparency.
MoGe was especially sensitive. Required data flow:

```text
immutable RGB ──> depth model ──> float depth + validity/confidence
       │                              │
       └──> mask model ──> alpha ─────┘ apply only after depth inference
```

Store the float depth, validity/confidence and display normalization metadata.
Generate the 8-bit preview as a derivative; do not make it the source of truth.

## iPhone 15 Pro, LiDAR and PromptDA

The iPhone 15 Pro has a LiDAR scanner. Apple exposes synchronized metric depth
and confidence through ARKit `sceneDepth`, and AVFoundation can capture LiDAR
depth on iPhone 12 Pro and later. Relevant official references:

- [iPhone 15 Pro technical specifications](https://support.apple.com/en-gb/111829)
- [ARKit sceneDepth](https://developer.apple.com/documentation/arkit/arconfiguration/framesemantics-swift.struct/scenedepth)
- [Capturing depth using the LiDAR camera](https://developer.apple.com/documentation/AVFoundation/capturing-depth-using-the-lidar-camera)

[Prompt Depth Anything](https://github.com/DepthAnything/PromptDA) is designed
for exactly this fusion: RGB plus a 192×256 ARKit LiDAR depth prompt produces
high-resolution metric depth. The official repository lists a 25.1M Small model
and a Small Transparent variant fine-tuned with simulated iPhone LiDAR for
transparent objects. It also warns that only the Large model was used in the
paper benchmark.

Consequences for Mapshroom:

- A normal uploaded JPEG has no guaranteed synchronized metric depth, so
  PromptDA cannot run as a generic fallback.
- The robust route is a native iOS capture bridge using ARKit/AVFoundation that
  exports RGB, float depth, confidence and camera calibration together.
- A lower-cost research route is importing a Stray Scanner capture, which the
  PromptDA project already supports.
- The current official implementation is PyTorch and has no validated
  ONNX/Transformers.js adapter in this benchmark. It needs an export spike,
  numerical parity test and WebGPU memory test before product integration.

LiDAR-assisted depth should appear only when compatible sensor data is present:
`Depth — LiDAR enhanced`, not as a model choice shown for every uploaded photo.

## Recommended product flow

Do not show four unrelated model names as equal choices. Ask first for intent and
keep one canonical alpha document:

| User choice | Engine | Behavior |
| --- | --- | --- |
| Manual Pen | No model | Start empty/current alpha; add and erase directly |
| Smart Pen | Cached SlimSAM | Add/remove local proposed patches |
| Automatic — Fast | MODNet q4 | Rough full matte quickly, then open correction |
| Automatic — Best quality | ORMBG q8 | Recommended full matte, then open correction |

All model outputs may be retained as non-destructive proposals or history
versions, but only one alpha is active. RGBA is derived from `original RGB +
active alpha`; it must not become a second editable source that can diverge.

For depth:

| Availability | Choice |
| --- | --- |
| Any RGB photo | DA2 Recommended; MoGe Geometry under Advanced/Experimental |
| Synchronized LiDAR package | LiDAR Enhanced / PromptDA research adapter |
| Manual correction | Near, Far, Smooth and Restore brushes on float depth |

## Next acceptance gates

1. Implement ORMBG q8 and SlimSAM embedding caching behind feature flags.
2. Fix original-RGB depth input and preserve float32 depth before adding models.
3. Run the same matrix in the actual browser with WASM and WebGPU, recording
   cold download, warm inference, peak memory and thermal behavior.
4. Add at least 30 Mapshroom images across hair, paintings, sculpture, glass,
   foliage, thin structures and dark-on-dark subjects.
5. Measure correction effort: seconds and strokes needed to reach an accepted
   mask/depth, not only automatic IoU.
6. Build a native iPhone 15 Pro capture proof of concept and export ten aligned
   RGB/depth/confidence samples before investing in PromptDA conversion.

## Reproducible artifacts

The runners live under `scripts/`. Downloaded models, datasets, float maps,
metrics and contact sheets are under ignored `tmp/` so they do not inflate the
repository. Key outputs:

- `tmp/benchmark-contact-sheets/mask-models.jpg`
- `tmp/benchmark-contact-sheets/depth-models.jpg`
- `tmp/benchmark-contact-sheets/depth-alpha-flow.jpg`
- `tmp/mask-benchmark/results/*/summary.json`
- `tmp/mask-benchmark/results/*-evaluation.json`
- `tmp/depth-benchmark/nyu-results/*-evaluation.json`
