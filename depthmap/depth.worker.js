import { env, pipeline, RawImage } from '@huggingface/transformers';

env.allowLocalModels = false;
env.useBrowserCache = true;
env.backends.onnx.wasm.numThreads = 1;

let activePipeline = null;
let activeKey = '';

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
  if (data.type !== 'estimate') return;

  try {
    const key = `${data.model}:${data.device}`;
    if (key !== activeKey || !activePipeline) {
      if (activePipeline?.dispose) await activePipeline.dispose();
      activePipeline = null;

      const options = {
        device: data.device,
        dtype: data.model.includes('large') ? 'fp32' : 'q8',
        progress_callback: reportProgress,
      };
      activePipeline = await pipeline('depth-estimation', data.model, options);
      activeKey = key;
    }

    self.postMessage({ type: 'phase', message: 'Estimating depth from the photo…' });
    const blob = new Blob([data.buffer], { type: data.mimeType });
    const image = await RawImage.fromBlob(blob);
    const output = await activePipeline(image);
    const depth = output.depth;
    const raw = output.predicted_depth;
    const pixels = depth.data.buffer;
    const rawDepth = raw?.data ? new Float32Array(raw.data) : null;

    self.postMessage({
      type: 'result',
      width: depth.width,
      height: depth.height,
      pixels,
      rawDepth: rawDepth?.buffer || null,
      rawWidth: raw?.dims?.at(-1) || depth.width,
      rawHeight: raw?.dims?.at(-2) || depth.height,
      inputWidth: image.width,
      inputHeight: image.height,
    }, rawDepth ? [pixels, rawDepth.buffer] : [pixels]);
  } catch (error) {
    try {
      if (activePipeline?.dispose) await activePipeline.dispose();
    } catch {
      // The failed backend may already have released its session.
    }
    activePipeline = null;
    activeKey = '';
    self.postMessage({ type: 'error', message: error?.message || String(error) });
  }
};
