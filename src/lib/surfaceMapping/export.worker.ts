import { exportLighting } from './lighting.js';
import { exportRaster } from './algorithms.js';
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
    const pixels = data.output === 'gradient' || data.output === 'field'
      ? exportLighting(data.result, data.rgba, width, height, original, data.lighting, data.output === 'field')
      : exportRaster(data.result, width, height, data.output === 'regions' ? 'palette' : data.output, data.selected);
    // Keep all outputs inside the original silhouette, including full-size zone masks.
    for (let i = 0; i < pixels.length; i += 4) {
      if (original[i + 3] <= 127 || (data.lighting.black && Math.max(original[i], original[i + 1], original[i + 2]) <= data.lighting.black)) {
        pixels[i] = pixels[i + 1] = pixels[i + 2] = 0;
      }
    }
    context.putImageData(new ImageData(pixels, width, height), 0, 0);
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    self.postMessage({ blob });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'Could not create the PNG. Please try again.' });
  } finally { bitmap?.close(); }
};
