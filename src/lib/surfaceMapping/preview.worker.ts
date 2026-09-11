import { refineSurfaces, renderRefined } from './refinement.js';
import type { SurfaceResult } from './types';
import type { PreviewRequest } from './preview-queue.js';

interface SourceMessage { type: 'source'; source: Blob; result: SurfaceResult; rgba: Uint8ClampedArray<ArrayBuffer>; black: number }

async function prepare(data: SourceMessage) {
  const bitmap = await createImageBitmap(data.source);
  try {
    // Enough pixels for a crisp HiDPI editor, without rerendering a 24 MP image
    // for every slider step. Export always reconstructs at original dimensions.
    const scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height), Math.sqrt(3e6 / (bitmap.width * bitmap.height)));
    const width = Math.max(1, Math.round(bitmap.width * scale)), height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = new OffscreenCanvas(width, height), context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('The preview canvas is unavailable.');
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, width, height);
    const original = context.getImageData(0, 0, width, height).data;
    const refined = refineSurfaces(data.result, data.rgba, width, height, original, data.black);
    // Sent once, so clicking a refined contour selects exactly the visible zone.
    self.postMessage({ type: 'ready', labels: refined.labels, width, height });
    return { ...data, refined, original };
  } finally { bitmap.close(); }
}

let source: Promise<{ value: Awaited<ReturnType<typeof prepare>> } | { error: string }> | undefined;
self.onmessage = async ({ data }: MessageEvent<SourceMessage | PreviewRequest>) => {
  if ('type' in data) {
    source = prepare(data).then(value => ({ value }), () => ({ error: 'Could not refine the preview. Close and reopen this editor.' }));
    return;
  }
  if (!source) return;
  try {
    const prepared = await source;
    if ('error' in prepared) throw new Error(prepared.error);
    const { result, rgba, refined, original, black } = prepared.value;
    const pixels = data.original ? original.slice() : renderRefined(result, rgba, refined, original, { ...data.lighting, black }, data.output, data.selected);
    self.postMessage({ requestId: data.requestId, pixels, width: refined.width, height: refined.height }, { transfer: [pixels.buffer] });
  } catch (error) {
    self.postMessage({ requestId: data.requestId, error: error instanceof Error ? error.message : 'Could not update the preview. Change the setting to try again.' });
  }
};
