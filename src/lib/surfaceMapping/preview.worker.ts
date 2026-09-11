import { renderLighting } from './lighting.js';
import { exportRaster, renderResult } from './algorithms.js';
import type { SurfaceResult } from './types';
import type { PreviewRequest } from './preview-queue.js';

let source: { result: SurfaceResult; rgba: Uint8ClampedArray<ArrayBuffer> } | undefined;
self.onmessage = ({ data }: MessageEvent<{ type: 'source'; result: SurfaceResult; rgba: Uint8ClampedArray<ArrayBuffer> } | PreviewRequest>) => {
  if ('type' in data) { source = data; return; }
  if (!source) return;
  try {
    const { result, rgba } = source;
    const pixels = data.original ? rgba.slice() : data.output === 'gradient' || data.output === 'field'
      ? renderLighting(result, rgba, data.lighting, false, 0, data.output === 'field')
      : data.output === 'mask' ? exportRaster(result, result.width, result.height, 'mask', data.selected || -1)
      : renderResult(result, rgba, data.output);
    self.postMessage({ requestId: data.requestId, pixels, width: result.width, height: result.height }, { transfer: [pixels.buffer] });
  } catch {
    self.postMessage({ requestId: data.requestId, error: 'Could not update the preview. Change the setting to try again.' });
  }
};
