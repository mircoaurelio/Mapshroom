import { THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT } from './shaderThumbnailKey';

/** A raster swatch: grayscale relief, edges and color targets; no 3D scene. */
export function createShaderThumbnailSource() {
  const canvas = document.createElement('canvas');
  canvas.width = THUMBNAIL_WIDTH;
  canvas.height = THUMBNAIL_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const relief = ctx.createRadialGradient(45, 30, 3, 62, 48, 42);
  relief.addColorStop(0, '#fafafa');
  relief.addColorStop(0.35, '#c8c8c8');
  relief.addColorStop(0.8, '#656565');
  relief.addColorStop(1, '#171717');
  ctx.fillStyle = relief;
  ctx.beginPath(); ctx.arc(59, 48, 41, 0, Math.PI * 2); ctx.fill();
  const colors = ['#f04838', '#40dd70', '#387bfa', '#f4d04d', '#e9e9e9', '#777777'];
  colors.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(108 + i % 2 * 19, 16 + Math.floor(i / 2) * 23, 16, 20);
  });
  return canvas;
}
