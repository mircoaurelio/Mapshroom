import { env, pipeline, RawImage, SamModel, AutoProcessor } from '@huggingface/transformers';

env.allowLocalModels = false;
env.useBrowserCache = true;
// A single WASM thread avoids cross-origin isolation requirements and reduces
// memory pressure on older or integrated-GPU machines.
env.backends.onnx.wasm.numThreads = 1;

let activePipeline = null;
let activeKey = '';
let samModel = null;
let samProcessor = null;

function reportProgress(progress) {
  const percent = progress.progress ?? (progress.loaded && progress.total ? (progress.loaded / progress.total) * 100 : 0);
  self.postMessage({
    type: 'progress',
    status: progress.status,
    file: progress.file || '',
    percent: Number.isFinite(percent) ? Math.round(percent) : 0,
  });
}

self.onmessage = async ({ data }) => {
  if (data.type === 'sam-segment') {
    try {
      if (!samModel || !samProcessor) {
        if (activePipeline?.dispose) await activePipeline.dispose();
        activePipeline = null;
        activeKey = '';
        self.postMessage({ type: 'sam-phase', message: 'Loading AI Magic Wand…' });
        const modelId = 'Xenova/slimsam-77-uniform';
        [samModel, samProcessor] = await Promise.all([
          SamModel.from_pretrained(modelId, { device: 'wasm', dtype: 'q8', progress_callback: reportProgress }),
          AutoProcessor.from_pretrained(modelId, { progress_callback: reportProgress }),
        ]);
      }

      self.postMessage({ type: 'sam-phase', message: 'Finding the violet selection…' });
      const blob = new Blob([data.buffer], { type: data.mimeType });
      const image = await RawImage.fromBlob(blob);
      const inputs = await samProcessor(image, { input_points: [data.points] });
      const outputs = await samModel(inputs);
      const masks = await samProcessor.post_process_masks(
        outputs.pred_masks,
        inputs.original_sizes,
        inputs.reshaped_input_sizes,
        { binarize: true },
      );
      const maskTensor = masks[0];
      const scores = outputs.iou_scores.data;
      let bestMask = 0;
      for (let index = 1; index < scores.length; index += 1) {
        if (scores[index] > scores[bestMask]) bestMask = index;
      }
      const height = maskTensor.dims.at(-2);
      const width = maskTensor.dims.at(-1);
      const pixelCount = width * height;
      const mask = new Uint8Array(maskTensor.data.slice(bestMask * pixelCount, (bestMask + 1) * pixelCount));
      self.postMessage({ type: 'sam-result', width, height, mask: mask.buffer, score: scores[bestMask] }, [mask.buffer]);
    } catch (error) {
      try {
        if (samModel?.dispose) await samModel.dispose();
      } catch {
        // Failed sessions may already be released.
      }
      samModel = null;
      samProcessor = null;
      self.postMessage({ type: 'error', job: 'sam', message: error?.message || String(error) });
    }
    return;
  }

  if (data.type !== 'segment') return;

  try {
    if (samModel?.dispose) await samModel.dispose();
    samModel = null;
    samProcessor = null;
    const key = `${data.model}:${data.device}`;
    if (key !== activeKey || !activePipeline) {
      if (activePipeline?.dispose) await activePipeline.dispose();
      activePipeline = null;

      const options = {
        device: data.device,
        progress_callback: reportProgress,
      };
      // MODNet only publishes reliable fp32 browser weights. The larger art
      // models expose quantized/fp16 variants to keep browser memory practical.
      if (data.device === 'webgpu') {
        options.dtype = 'fp16';
      } else if (data.model === 'onnx-community/BiRefNet_lite-ONNX') {
        options.dtype = 'fp32';
      } else if (data.model === 'onnx-community/BEN2-ONNX') {
        options.dtype = 'fp16';
      } else {
        options.dtype = 'q4';
      }
      activePipeline = await pipeline('background-removal', data.model, options);
      activeKey = key;
    }

    self.postMessage({ type: 'phase', message: 'Tracing artwork edges…' });
    const blob = new Blob([data.buffer], { type: data.mimeType });
    const image = await RawImage.fromBlob(blob);
    const output = await activePipeline(image);
    const result = output[0].rgba();
    const pixels = result.data.buffer;

    self.postMessage({ type: 'result', width: result.width, height: result.height, pixels }, [pixels]);
  } catch (error) {
    try {
      if (activePipeline?.dispose) await activePipeline.dispose();
    } catch {
      // The failed backend may already have released its session.
    }
    activePipeline = null;
    activeKey = '';
    self.postMessage({ type: 'error', device: data.device, message: error?.message || String(error) });
  }
};
