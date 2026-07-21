# Mapshroom Artwork Segmenter MVP

A standalone browser-only demo for isolating statues, drawings, and paintings from their backgrounds.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173/segmentation/`.

## How it works

- Inference runs locally in a Web Worker through Transformers.js and ONNX Runtime Web.
- Inference uses single-threaded WASM/CPU safe mode. WebGPU is intentionally disabled because several integrated-GPU backends cannot execute the models' MaxPool `ceil_mode` shape computation.
- ORMBG is selected by default and automatic background removal runs immediately after image upload. Changing the model reruns segmentation when Auto Remove is enabled; Manual mode skips inference.
- Model files are downloaded from Hugging Face on first use and then stored in the browser cache.
- Uploaded artwork is processed in memory and is never sent to an application server.
- A full-resolution erase/restore pencil can create a mask without AI or clean up an AI result.
- Smart Erase provides a model-free, Photoshop-style connected-region selection with adjustable color tolerance and edge softness.
- Hard Mask mode converts the result to binary alpha (fully opaque or transparent) and previews it against black.
- The crop tool provides a movable rule-of-thirds frame, eight resize handles, aspect presets, and full-resolution destructive crop application across the source and mask.
- AI Magic Wand uses SlimSAM after explicit confirmation. Minus mode removes the prompted region; Plus mode restores the corresponding original pixels when automatic segmentation removed too much. Cancel discards the non-destructive colored prompt.
- Undo and redo cover model results, AI wand changes, Smart Erase, individual pencil strokes, resets, and confirmed crops. Use the buttons or `Ctrl+Z`, `Ctrl+Shift+Z`, and `Ctrl+Y`.
- Export always uses the original RGB pixels and a hard binary mask. Download either the standalone mask (white kept, black removed) or the original image with every removed pixel painted black.

## Included model profiles

- **ORMBG**: default general-purpose object/background removal.
- **BiRefNet Lite**: detailed artwork and complex silhouettes.
- **BEN2**: higher-detail, heavier model.
- **MODNet**: fast portrait-oriented fallback.

Large models can require several hundred megabytes of download and substantial device memory. ORMBG Q4 is the recommended AI option for low-memory computers; the model-free Smart Erase and Pencil tools require no model download.

## Reproducible CPU model test

```bash
node segmentation/test-model.mjs "C:/path/to/input.png" "segmentation/test-results/output.png"
```

The harness runs the ORMBG Q4 model with the software CPU provider, reports model/inference timing and mask coverage, then saves both the transparent output and a checkerboard preview.
