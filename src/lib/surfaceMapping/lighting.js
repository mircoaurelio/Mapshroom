import { boundaryDistance } from './surfaces.js';

const clamp = v => Math.max(0, Math.min(1, v));
const thermal = [[.05,.015,.26],[.08,.08,.88],[0,.72,1],[0,1,.67],[.56,1,.08],[1,.91,0],[1,.36,0],[.93,.015,0]];
const cool = [[.025,.035,.16],[.18,.10,.70],[.16,.42,1],[.04,.93,.96],[.83,1,1]];
export function colorRamp(value, palette = 'thermal') {
  const colors = palette === 'cool' ? cool : thermal, scaled = clamp(value) * (colors.length - 1), i = Math.min(colors.length - 2, Math.floor(scaled)), t = scaled - i;
  return colors[i].map((v, c) => (v * (1 - t) + colors[i + 1][c] * t) * 255);
}

function basis(result) {
  if (result.lighting) return result.lighting;
  const { labels, width: w, height: h, count } = result;
  const distance = boundaryDistance(labels, w, h), max = new Float32Array(count + 1), bounds = Array.from({ length: count + 1 }, () => [w,h,0,0]);
  let minX = w, minY = h, maxX = 0, maxY = 0;
  for (let i = 0; i < labels.length; i++) if (labels[i]) {
    const id = labels[i], x = i % w, y = Math.floor(i / w), b = bounds[id];
    b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y); max[id] = Math.max(max[id], distance[i]);
    minX = Math.min(minX,x); minY = Math.min(minY,y); maxX = Math.max(maxX,x); maxY = Math.max(maxY,y);
  }
  const silhouetteDistance = boundaryDistance(Uint32Array.from(labels, id => id ? 1 : 0), w, h);
  result.lighting = { distance, silhouetteDistance, max, bounds, global: [minX,minY,maxX,maxY] };
  return result.lighting;
}

export function lightingFields(result, rgba, options = {}) {
  const { labels, width: w } = result, b = basis(result), values = new Float32Array(labels.length), alpha = new Float32Array(labels.length);
  const angle = (options.angle ?? 90) * Math.PI / 180, dx = Math.cos(angle), dy = Math.sin(angle);
  const texture = (options.texture ?? 10) / 100, feather = options.feather ?? 1;
  for (let i = 0; i < labels.length; i++) if (labels[i]) {
    const id = labels[i], x = i % w, y = Math.floor(i / w);
    let value;
    if (!options.style || options.style === 'radial') value = .22 + .72 * Math.pow(clamp((b.distance[i] - 1) / Math.max(1, b.max[id] - 1)), .7);
    else {
      const bounds = options.style === 'global' ? b.global : b.bounds[id];
      const min = (dx >= 0 ? bounds[0] : bounds[2]) * dx + (dy >= 0 ? bounds[1] : bounds[3]) * dy;
      const max = (dx >= 0 ? bounds[2] : bounds[0]) * dx + (dy >= 0 ? bounds[3] : bounds[1]) * dy;
      value = .15 + .8 * clamp((x * dx + y * dy - min) / Math.max(1, max - min));
    }
    // The photograph affects only shading. It never creates additional region IDs.
    const o = i * 4, luminance = (.299 * rgba[o] + .587 * rgba[o + 1] + .114 * rgba[o + 2]) / 255;
    values[i] = clamp(value + texture * (luminance - .4));
    const edgeDistance = options.style === 'global' ? b.silhouetteDistance[i] : b.distance[i];
    alpha[i] = feather ? clamp(edgeDistance / (feather + 1)) : 1;
  }
  return { values, alpha };
}

export function renderLighting(result, rgba, options = {}, overlay = false, selected = 0, fieldOnly = false) {
  const fields = lightingFields(result, rgba, options), out = new Uint8ClampedArray(rgba.length), opacity = options.opacity ?? .65;
  for (let i = 0; i < result.labels.length; i++) {
    const o = i * 4, id = result.labels[i], a = fields.alpha[i] * (selected && id !== selected ? .18 : 1);
    const color = fieldOnly ? [fields.values[i] * 255, fields.values[i] * 255, fields.values[i] * 255] : colorRamp(fields.values[i], options.palette);
    for (let c = 0; c < 3; c++) out[o + c] = overlay ? rgba[o + c] * (1 - a * opacity) + color[c] * a * opacity : color[c] * a;
    out[o + 3] = 255;
  }
  return out;
}

export function exportLighting(result, rgba, width, height, nativeRgba, options = {}, fieldOnly = false) {
  if (width * height > 24e6) throw new Error('Esportazione limitata a 24 MP.');
  const { values, alpha } = lightingFields(result, rgba, options), out = new Uint8ClampedArray(width * height * 4);
  const { labels, width: w, height: h } = result;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const o = (y * width + x) * 4; out[o + 3] = 255;
    const near = Math.min(h - 1, Math.floor(y * h / height)) * w + Math.min(w - 1, Math.floor(x * w / width)), id = labels[near];
    if (!id || nativeRgba[o + 3] <= 127 || (options.black && Math.max(nativeRgba[o], nativeRgba[o + 1], nativeRgba[o + 2]) <= options.black)) continue;
    const fx = Math.max(0, Math.min(w - 1, (x + .5) * w / width - .5)), fy = Math.max(0, Math.min(h - 1, (y + .5) * h / height - .5));
    const xx = Math.floor(fx), yy = Math.floor(fy), tx = fx - xx, ty = fy - yy;
    let value = 0, a = 0, total = 0;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      const p = Math.min(h - 1, yy + dy) * w + Math.min(w - 1, xx + dx), weight = (dx ? tx : 1 - tx) * (dy ? ty : 1 - ty);
      if (labels[p] !== id) continue;
      value += values[p] * weight; a += alpha[p] * weight; total += weight;
    }
    if (!total) { value = values[near]; a = alpha[near]; total = 1; }
    const color = fieldOnly ? [value / total * 255, value / total * 255, value / total * 255] : colorRamp(value / total, options.palette);
    for (let c = 0; c < 3; c++) out[o + c] = color[c] * a / total;
  }
  return out;
}
