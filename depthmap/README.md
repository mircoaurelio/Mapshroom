# Mapshroom Depth Map MVP

A standalone browser-only demo for turning photos into monocular depth maps with on-device AI.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173/depthmap/`.

## How it works

- Inference runs locally in a Web Worker through Transformers.js and ONNX Runtime Web.
- Inference uses single-threaded WASM/CPU safe mode. WebGPU is intentionally disabled for broader hardware support.
- Depth Anything Small is selected by default and automatic depth estimation runs immediately after image upload. Changing the model reruns estimation when Auto Estimate is enabled.
- Model files are downloaded from Hugging Face on first use and then stored in the browser cache.
- Uploaded photos are processed in memory and are never sent to an application server.
- A compare slider lets you inspect the original photo against the generated depth map.
- A **Depth amount** slider (0–900%, default 450%) controls relief intensity. Raw AI depth is percentile-normalized, amplified, sharpened, then stretched to full black-to-white range.
- A **Definition** slider boosts sharp relief and pulls surface detail (palm lines, facial contours) from the source photo.
- Two canvas toggles switch preview between **BW** (grayscale depth) and **RGB** (turbo colormap).
- Fine contrast, gamma, and overlay blend controls adjust the preview and exported PNG.
- Export the current mode, both BW + RGB, or a photo + depth overlay blend.

## Included model profiles

- **Depth Anything Small**: default CPU-tested model for sculptures, rooms, and mixed scenes.
- **Depth Anything V2 Small**: newer weights with sharper relief transitions.
- **Depth Anything Large**: higher-detail model; slower on CPU and needs more memory.

Large models can require several hundred megabytes of download and substantial device memory. Depth Anything Small is the recommended option for low-memory computers.

## Reproducible CPU model test

```bash
node depthmap/test-model.mjs "C:/path/to/input.png" "depthmap/test-results/output.png"
```

The harness runs the Depth Anything Small model with the software CPU provider, reports model/inference timing and depth range, then saves both the raw depth output and a grayscale preview.
