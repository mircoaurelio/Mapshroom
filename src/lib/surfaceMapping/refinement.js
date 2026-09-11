import { exportRaster, labelEdges } from './algorithms.js';
import { exportLighting } from './lighting.js';

// Joint spatial/color upsampling in a narrow band around the analyzed boundaries.
// Only existing IDs can win: fine photo texture must never create new zones.
export function refineSurfaces(result, rgba, width, height, original, black = 8) {
  if (width * height > 24e6) throw new Error('Please use an image of 24 megapixels or less.');
  const { labels, width: w, height: h, count } = result;
  const refined = new Uint32Array(width * height);
  const band = new Uint8Array(w * h);
  const guide = new Float32Array(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    let samples = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      const p = yy * w + xx;
      if (labels[p] !== labels[i]) { band[i] = 1; continue; }
      samples++;
      for (let c = 0; c < 3; c++) guide[i * 3 + c] += rgba[p * 4 + c];
    }
    for (let c = 0; c < 3; c++) guide[i * 3 + c] /= samples;
  }
  const axis = (size, small) => {
    const positions = new Int32Array(size * 4), weights = new Float32Array(size * 4);
    for (let x = 0; x < size; x++) {
      const at = (x + .5) * small / size - .5, base = Math.floor(at);
      for (let k = 0; k < 4; k++) {
        const sample = base + k - 1;
        positions[x * 4 + k] = Math.max(0, Math.min(small - 1, sample));
        weights[x * 4 + k] = Math.exp(-((sample - at) ** 2) / .72);
      }
    }
    return { positions, weights };
  };
  const ax = axis(width, w), ay = axis(height, h);
  const scores = new Float32Array(count + 1), candidates = new Uint32Array(16);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = y * width + x, o = i * 4;
    if (!original[o + 3] || (black && Math.max(original[o], original[o + 1], original[o + 2]) <= black)) continue;
    const near = Math.min(h - 1, Math.floor(y * h / height)) * w + Math.min(w - 1, Math.floor(x * w / width));
    if (!band[near] || (width === w && height === h)) { refined[i] = labels[near]; continue; }
    let used = 0;
    for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 4; dx++) {
      const p = ay.positions[y * 4 + dy] * w + ax.positions[x * 4 + dx], id = labels[p];
      if (!scores[id]) candidates[used++] = id;
      const r = original[o] - guide[p * 3], g = original[o + 1] - guide[p * 3 + 1], b = original[o + 2] - guide[p * 3 + 2];
      // A bounded color weight keeps texture/shadows from tearing a smooth contour apart.
      const color = .35 + .65 / (1 + (r * r + g * g + b * b) / (3 * 32 * 32));
      scores[id] += ax.weights[x * 4 + dx] * ay.weights[y * 4 + dy] * color;
    }
    let best = labels[near], score = scores[best];
    for (let c = 0; c < used; c++) {
      const id = candidates[c];
      if (scores[id] > score) { best = id; score = scores[id]; }
    }
    refined[i] = best;
    for (let c = 0; c < used; c++) scores[candidates[c]] = 0;
  }
  return { labels: refined, edges: labelEdges(refined, width, height), width, height, count };
}

// Preview and PNG export share the same reconstruction and silhouette treatment.
export function renderRefined(result, rgba, refined, original, lighting, output, selected = 0) {
  const { width, height } = refined;
  if (output === 'gradient' || output === 'field') return exportLighting(result, rgba, width, height, original, lighting, output === 'field', refined);
  const pixels = exportRaster(refined, width, height, output === 'regions' ? 'palette' : output, selected || -1);
  for (let o = 0; o < pixels.length; o += 4) {
    const alpha = original[o + 3] / 255;
    for (let c = 0; c < 3; c++) pixels[o + c] *= alpha;
  }
  return pixels;
}
