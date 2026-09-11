import { refineSurfaces, renderRefined } from './refinement.js';
import type { LightingOptions, SurfaceOutput, SurfaceResult } from './types';

self.onmessage = async ({ data }: MessageEvent<{
  source: Blob; result: SurfaceResult; rgba: Uint8ClampedArray;
  output: SurfaceOutput; selected: number; lighting: LightingOptions;
}>) => {
  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(data.source);
    const { width, height } = bitmap;
    if (width * height > 24e6) throw new Error('Please use an image of 24 megapixels or less.');
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('The image canvas is unavailable.');
    context.drawImage(bitmap, 0, 0);
    const original = context.getImageData(0, 0, width, height).data;
    const refined = refineSurfaces(data.result, data.rgba, width, height, original, data.lighting.black);
    const pixels = renderRefined(data.result, data.rgba, refined, original, data.lighting, data.output, data.selected);
    context.putImageData(new ImageData(pixels, width, height), 0, 0);
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    self.postMessage({ blob });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'Could not create the PNG. Please try again.' });
  } finally { bitmap?.close(); }
};
