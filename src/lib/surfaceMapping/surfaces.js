import { prepareImage, connectedRegions, labelEdges } from './algorithms.js';

class Heap {
  items = [];
  push(item) {
    const a = this.items; let i = a.length; a.push(item);
    while (i > 0) { const p = (i - 1) >> 1; if (a[p].key <= item.key) break; a[i] = a[p]; i = p; } a[i] = item;
  }
  pop() {
    const a = this.items, first = a[0], last = a.pop(); if (!a.length) return first;
    let i = 0;
    while (2 * i + 1 < a.length) { let c = 2 * i + 1; if (c + 1 < a.length && a[c + 1].key < a[c].key) c++; if (a[c].key >= last.key) break; a[i] = a[c]; i = c; }
    a[i] = last; return first;
  }
  get length() { return this.items.length; }
}

// Separable normalized convolution: excluded background never darkens the filtered colors.
function box(data, w, h, radius, channels) {
  const temp = new Float32Array(data.length), out = new Float32Array(data.length);
  for (let y = 0; y < h; y++) for (let c = 0; c < channels; c++) {
    let sum = 0;
    for (let x = 0; x <= Math.min(w - 1, radius); x++) sum += data[(y * w + x) * channels + c];
    for (let x = 0; x < w; x++) {
      temp[(y * w + x) * channels + c] = sum;
      if (x - radius >= 0) sum -= data[(y * w + x - radius) * channels + c];
      if (x + radius + 1 < w) sum += data[(y * w + x + radius + 1) * channels + c];
    }
  }
  for (let x = 0; x < w; x++) for (let c = 0; c < channels; c++) {
    let sum = 0;
    for (let y = 0; y <= Math.min(h - 1, radius); y++) sum += temp[(y * w + x) * channels + c];
    for (let y = 0; y < h; y++) {
      out[(y * w + x) * channels + c] = sum;
      if (y - radius >= 0) sum -= temp[((y - radius) * w + x) * channels + c];
      if (y + radius + 1 < h) sum += temp[((y + radius + 1) * w + x) * channels + c];
    }
  }
  return out;
}

export function prepareSurface(image, smoothing = 65) {
  const { width: w, height: h, n } = image, mask = image.mask.slice();
  const minimum = Math.max(4, Math.round(n * .00012 * smoothing / 65));
  const islands = connectedRegions(new Uint8Array(n), mask, w, h), sizes = new Uint32Array(islands.count + 1);
  for (const id of islands.labels) sizes[id]++;
  for (let i = 0; i < n; i++) if (mask[i] && sizes[islands.labels[i]] < minimum) mask[i] = 0;
  // Only fill tiny, fully enclosed opaque pinholes, retaining real cutouts and the silhouette.
  const inverse = Uint8Array.from(mask, v => 1 - v), holes = connectedRegions(new Uint8Array(n), inverse, w, h);
  const holeSizes = new Uint32Array(holes.count + 1), open = new Uint8Array(holes.count + 1);
  for (let i = 0; i < n; i++) if (holes.labels[i]) {
    const id = holes.labels[i]; holeSizes[id]++;
    if (i < w || i >= n - w || i % w === 0 || i % w === w - 1 || image.rgba[i * 4 + 3] <= 127) open[id] = 1;
  }
  for (let i = 0; i < n; i++) if (holes.labels[i] && !open[holes.labels[i]] && holeSizes[holes.labels[i]] < minimum) mask[i] = 1;
  const radius = Math.round(Math.max(w, h) * smoothing / 100 * .018);
  let rgba = image.rgba.slice();
  for (let pass = 0; radius && pass < 2; pass++) {
    const weighted = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) if (mask[i]) { for (let c = 0; c < 3; c++) weighted[i * 4 + c] = rgba[i * 4 + c]; weighted[i * 4 + 3] = 1; }
    const blurred = box(weighted, w, h, radius, 4);
    for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) rgba[i * 4 + c] = mask[i] && blurred[i * 4 + 3] ? blurred[i * 4 + c] / blurred[i * 4 + 3] : 0;
  }
  const result = prepareImage(rgba, w, h, 0);
  result.mask = mask; result.active = mask.reduce((a, v) => a + v, 0);
  return result;
}

// Chamfer distance inside each zone. It describes shape, not estimated scene depth.
export function boundaryDistance(labels, w, h) {
  const n = w * h, d = new Float32Array(n), diagonal = Math.SQRT2;
  for (let i = 0; i < n; i++) if (labels[i]) {
    const id = labels[i], x = i % w;
    d[i] = i < w || i >= n - w || !x || x === w - 1 || labels[i - 1] !== id || labels[i + 1] !== id || labels[i - w] !== id || labels[i + w] !== id ? 1 : 1e6;
  }
  function relax(i, q, cost) { if (q >= 0 && q < n && labels[q] === labels[i]) d[i] = Math.min(d[i], d[q] + cost); }
  for (let i = 0; i < n; i++) if (labels[i]) {
    const x = i % w;
    if (x) { relax(i, i - 1, 1); relax(i, i - w - 1, diagonal); }
    relax(i, i - w, 1); if (x < w - 1) relax(i, i - w + 1, diagonal);
  }
  for (let i = n - 1; i >= 0; i--) if (labels[i]) {
    const x = i % w;
    if (x < w - 1) { relax(i, i + 1, 1); relax(i, i + w + 1, diagonal); }
    relax(i, i + w, 1); if (x) relax(i, i + w - 1, diagonal);
  }
  return d;
}

export function shapeRegions(image, target = 12) {
  const { width: w, height: h, n, mask } = image;
  const components = connectedRegions(new Uint8Array(n), mask, w, h);
  const distance = boundaryDistance(components.labels, w, h), candidates = [], order = [];
  const parent = new Int32Array(n).fill(-1), peak = new Uint32Array(n);
  const find = i => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  for (let i = 0; i < n; i++) if (mask[i]) order.push(i);
  order.sort((a, b) => distance[b] - distance[a] || a - b);
  // Keep persistent distance maxima: wide lobes separated by a narrow neck get distinct seeds.
  // Flat ridges and shallow bumps do not consume the zone budget.
  for (const i of order) {
    parent[i] = i; peak[i] = i; const x = i % w;
    for (const q of [x ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) if (q >= 0 && q < n && parent[q] >= 0) {
      let a = find(i), b = find(q); if (a === b) continue;
      if (distance[peak[a]] < distance[peak[b]] || (distance[peak[a]] === distance[peak[b]] && peak[a] > peak[b])) [a, b] = [b, a];
      const prominence = distance[peak[b]] - distance[i];
      if (prominence > 0) candidates.push({ p: peak[b], prominence, score: prominence * distance[peak[b]] });
      parent[b] = a;
    }
  }
  const seeds = order.filter(i => parent[i] === i).map(i => peak[i]);
  const minimumProminence = Math.max(2, (order.length ? distance[order[0]] : 0) * .08);
  candidates.sort((a, b) => b.score - a.score || a.p - b.p);
  for (const candidate of candidates) {
    if (seeds.length >= target) break;
    if (candidate.prominence >= minimumProminence) seeds.push(candidate.p);
  }
  const labels = new Uint32Array(n), heap = new Heap();
  for (let s = 0; s < seeds.length; s++) { labels[seeds[s]] = s + 1; heap.push({ p: seeds[s], key: -distance[seeds[s]] }); }
  while (heap.length) {
    const { p, key } = heap.pop(), x = p % w;
    for (const q of [x ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w]) if (q >= 0 && q < n && mask[q] && !labels[q]) {
      labels[q] = labels[p]; heap.push({ p: q, key: Math.max(key, -distance[q]) });
    }
  }
  return { labels, count: seeds.length, width: w, height: h };
}

export function mergeToBudget(result, image, target, edgeMap) {
  const { labels, count } = result, { n, width: w, lab } = image;
  if (count <= target) return result;
  const parent = Uint32Array.from({ length: count + 1 }, (_, i) => i), versions = new Uint32Array(count + 1);
  const sizes = new Uint32Array(count + 1), sums = new Float64Array((count + 1) * 3), adjacency = Array.from({ length: count + 1 }, () => new Map());
  const heap = new Heap(), ideal = Math.max(1, image.active / target);
  for (let i = 0; i < n; i++) if (labels[i]) { sizes[labels[i]]++; for (let c = 0; c < 3; c++) sums[labels[i] * 3 + c] += lab[i * 3 + c]; }
  function addBoundary(i, j) {
    const a = labels[i], b = labels[j]; if (!a || !b || a === b) return;
    let boundary = adjacency[a].get(b);
    if (!boundary) { boundary = { total: 0, length: 0 }; adjacency[a].set(b, boundary); adjacency[b].set(a, boundary); }
    boundary.length++; boundary.total += edgeMap ? (edgeMap[i] + edgeMap[j]) / 2 : Math.hypot(lab[i * 3] - lab[j * 3], lab[i * 3 + 1] - lab[j * 3 + 1], lab[i * 3 + 2] - lab[j * 3 + 2]);
  }
  for (let i = 0; i < n; i++) { if (i % w < w - 1) addBoundary(i, i + 1); if (i + w < n) addBoundary(i, i + w); }
  function enqueue(a, b) {
    const edge = adjacency[a].get(b); if (!edge) return;
    let color = 0; for (let c = 0; c < 3; c++) color += (sums[a * 3 + c] / sizes[a] - sums[b * 3 + c] / sizes[b]) ** 2;
    // Tiny decorations should not consume the entire budget while one region absorbs the stage.
    const relevance = Math.min(1, Math.min(sizes[a], sizes[b]) / (ideal * .15));
    const scale = (sizes[a] + sizes[b]) / ideal;
    const key = relevance * (Math.sqrt(color) + edge.total / edge.length * (edgeMap ? .55 : .8)) + 18 * scale + 8 * scale * scale;
    heap.push({ a, b, av: versions[a], bv: versions[b], key });
  }
  for (let a = 1; a <= count; a++) for (const b of adjacency[a].keys()) if (a < b) enqueue(a, b);
  let remaining = count;
  while (remaining > target && heap.length) {
    const item = heap.pop(); let { a, b } = item;
    if (parent[a] !== a || parent[b] !== b || versions[a] !== item.av || versions[b] !== item.bv) continue;
    if (sizes[a] < sizes[b]) [a, b] = [b, a];
    parent[b] = a; sizes[a] += sizes[b]; versions[a]++; remaining--;
    for (let c = 0; c < 3; c++) sums[a * 3 + c] += sums[b * 3 + c];
    adjacency[a].delete(b);
    for (const [q, boundary] of adjacency[b]) {
      adjacency[q].delete(b); if (q === a) continue;
      const current = adjacency[a].get(q);
      const merged = current ? { total: current.total + boundary.total, length: current.length + boundary.length } : boundary;
      adjacency[a].set(q, merged); adjacency[q].set(a, merged);
    }
    adjacency[b].clear();
    for (const q of adjacency[a].keys()) enqueue(a, q);
  }
  const remap = new Uint32Array(count + 1); let total = 0;
  for (let i = 0; i < n; i++) if (labels[i]) {
    let r = labels[i]; while (parent[r] !== r) { parent[r] = parent[parent[r]]; r = parent[r]; }
    if (!remap[r]) remap[r] = ++total; labels[i] = remap[r];
  }
  return { ...result, count: total };
}

export function finishSurface(result, image, target, smoothing, edgeMap) {
  let merged = mergeToBudget(result, image, target, edgeMap), labels = merged.labels;
  const { width: w, height: h, n, mask } = image;
  // Majority regularization moves only internal zone boundaries; the silhouette is retained.
  for (let pass = 0; pass < Math.round(smoothing / 25); pass++) {
    const out = labels.slice();
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x; if (!mask[i]) continue;
      const votes = new Map();
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const id = labels[i + dy * w + dx]; if (id) votes.set(id, (votes.get(id) || 0) + 1); }
      for (const [id, count] of votes) if (count >= 5) { out[i] = id; break; }
    }
    labels = out;
  }
  merged = connectedRegions(labels, mask, w, h);
  // Reconnect ID bookkeeping after regularization, then absorb small neighboring fragments.
  merged = mergeToBudget(merged, image, target, edgeMap);
  return { ...merged, width: w, height: h, edges: labelEdges(merged.labels, w, h), surface: true, target, maskPixels: n };
}
