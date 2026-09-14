import { THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT } from './shaderThumbnailKey';

/** One flat square with a simple luminance gradient; no mesh or extra swatches. */
export function createShaderThumbnailSource() {
  const canvas = document.createElement('canvas');
  canvas.width = THUMBNAIL_WIDTH;
  canvas.height = THUMBNAIL_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable');
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#f5f5f5');
  gradient.addColorStop(0.5, '#929292');
  gradient.addColorStop(1, '#202020');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}
