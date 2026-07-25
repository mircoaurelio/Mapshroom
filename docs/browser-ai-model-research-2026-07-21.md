# Browser AI model research — 21 July 2026

## Decision

Mapshroom uses Transformers.js because it is already part of the app, supports WebGPU with a WASM fallback, and stores fetched model artifacts in the browser cache. Downloads are user initiated. Local inference sends neither prompts nor stage images to an AI provider.

Vision is optional and off by default. When enabled locally, Florence-2 Base FT creates a detailed caption of the current rendered stage frame. That caption is injected into the shader request. When enabled with Gemini, the current frame is attached directly to the multimodal request.

## Local catalog

| Tier | Model | Role | Approx. quantized download | Practical target |
| --- | --- | --- | ---: | --- |
| Vision | `onnx-community/Florence-2-base-ft` | Detailed stage caption | ~0.8 GB | 4 GB+ free RAM |
| Small | `onnx-community/SmolLM2-360M-Instruct-ONNX` | GLSL generation | ~0.3 GB | 2 GB+ free RAM |
| Medium | `onnx-community/Qwen2.5-Coder-0.5B-Instruct` | GLSL generation | ~0.4 GB | 2 GB+ free RAM |
| Big | `onnx-community/Qwen2.5-Coder-1.5B-Instruct` | GLSL generation | ~1.1 GB | 4 GB+ free RAM |
| Ultra | `onnx-community/Qwen2.5-Coder-3B-Instruct` | GLSL generation | ~2.4 GB | 8 GB+ free RAM, desktop WebGPU |

Sizes are planning estimates rather than guaranteed transfer sizes: dtype, browser, model revision, and external ONNX weight layout can change the actual download. “Ultra” remains browser-local but is not suitable for every GPU.

## Why these models

- Qwen 2.5 Coder is code-specialized, Apache-2.0 licensed, and its ONNX Community conversions explicitly support Transformers.js.
- SmolLM2 supplies a genuinely small fallback, while Qwen 2.5 Coder scales from 0.5B to a WebGPU-only 3B ceiling without the oversized 4B shard that can abort browser runtimes.
- Florence-2 Base FT is MIT licensed, browser compatible, and supports the `MORE_DETAILED_CAPTION` task needed to turn a shader preview into concise visual context.
- Gemini remains the hosted path. Current Gemini models accept multimodal input, so the same stage-frame context can be used without a separate vision download.

## Operational caveats

- WebGPU availability and memory limits vary. WASM fallback is viable mainly for Small and sometimes Medium.
- Browser storage eviction can remove cached weights; “download once” means once per retained browser cache/profile.
- Local models are free to run but downloading weights still uses bandwidth and electricity.
- Model licenses permit use, but users remain responsible for input/output rights and provider terms when using Gemini.

## Primary sources

- Hugging Face Transformers.js WebGPU guide: https://huggingface.co/docs/transformers.js/en/guides/webgpu
- Transformers.js documentation: https://huggingface.co/docs/transformers.js/main/index
- Qwen 2.5 Coder 0.5B ONNX model card: https://huggingface.co/onnx-community/Qwen2.5-Coder-0.5B-Instruct
- Qwen 2.5 Coder 1.5B ONNX model card: https://huggingface.co/onnx-community/Qwen2.5-Coder-1.5B-Instruct
- Qwen 2.5 Coder 3B ONNX model card: https://huggingface.co/onnx-community/Qwen2.5-Coder-3B-Instruct
- SmolLM2 360M Instruct ONNX model: https://huggingface.co/onnx-community/SmolLM2-360M-Instruct-ONNX
- Florence-2 Base FT ONNX model card: https://huggingface.co/onnx-community/Florence-2-base-ft
- Gemini image understanding: https://ai.google.dev/gemini-api/docs/generate-content/image-understanding
