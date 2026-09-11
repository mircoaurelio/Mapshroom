// All coordinates and labels refer to the shared analysis raster. Label 0 is excluded background.
export const METHODS = [
  { id: 'shape', name: 'Forma · Silhouette', kind: 'Algoritmo', weight: '0 MB', description: 'Divide i volumi della sagoma, ignorando la texture.', symbol: '◉' },
  { id: 'lab', name: 'Colori · Lab', kind: 'Algoritmo', weight: '0 MB', description: 'Colori simili, poi separazione delle aree connesse.', symbol: '◐' },
  { id: 'slic', name: 'Superpixel · SLIC', kind: 'Algoritmo', weight: '0 MB', description: 'Piccole zone compatte che seguono colore e posizione.', symbol: '▦' },
  { id: 'graph', name: 'Regioni · Grafo', kind: 'Algoritmo', weight: '0 MB', description: 'Unisce pixel vicini in base al contrasto locale.', symbol: '⌘' },
  { id: 'canny', name: 'Bordi · Canny', kind: 'Algoritmo', weight: '0 MB', description: 'Bordi classici, poi crescita automatica delle regioni.', symbol: '⌁' },
  { id: 'pidi-tiny', name: 'PiDiNet Tiny', kind: 'CNN', weight: '0,4 MB', description: 'Rete compatta per i bordi + crescita delle regioni.', symbol: '⋈' },
  { id: 'pidi', name: 'PiDiNet', kind: 'CNN', weight: '3,0 MB', description: 'Rete più ampia per i bordi + la stessa crescita.', symbol: '⋈' },
];

export function prepareImage(rgba, width, height, black = 8) {
  const n = width * height;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || rgba.length !== n * 4) throw new Error('Dimensioni immagine non valide.');
  const lab = new Float32Array(n * 3), gray = new Float32Array(n), mask = new Uint8Array(n);
  const linear = Float32Array.from({ length: 256 }, (_, v) => v / 255 <= .04045 ? v / 3294.6 : ((v / 255 + .055) / 1.055) ** 2.4);
  const f = t => t > .008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  let active = 0;
  for (let i = 0; i < n; i++) {
    const o = i * 4, r = rgba[o], g = rgba[o + 1], b = rgba[o + 2];
    mask[i] = rgba[o + 3] > 127 && (black === 0 || Math.max(r, g, b) > black) ? 1 : 0;
    active += mask[i];
    const lr = linear[r], lg = linear[g], lb = linear[b];
    const x = f((.4124564 * lr + .3575761 * lg + .1804375 * lb) / .95047);
    const y = f(.2126729 * lr + .7151522 * lg + .072175 * lb);
    const z = f((.0193339 * lr + .119192 * lg + .9503041 * lb) / 1.08883);
    lab[i * 3] = 116 * y - 16; lab[i * 3 + 1] = 500 * (x - y); lab[i * 3 + 2] = 200 * (y - z);
    gray[i] = .299 * r + .587 * g + .114 * b;
  }
  return { rgba, width, height, n, lab, gray, mask, active };
}

export function connectedRegions(groups, mask, w, h) {
  const n = w * h, labels = new Uint32Array(n), queue = new Uint32Array(n);
  let count = 0;
  for (let i = 0; i < n; i++) {
    if (!mask[i] || labels[i]) continue;
    const group = groups[i];
    let head = 0, tail = 1;
    queue[0] = i; labels[i] = ++count;
    while (head < tail) {
      const p = queue[head++], x = p % w;
      for (let d = 0; d < 4; d++) {
        const q = d === 0 ? (x ? p - 1 : -1) : d === 1 ? (x < w - 1 ? p + 1 : -1) : d === 2 ? p - w : p + w;
        if (q >= 0 && q < n && mask[q] && !labels[q] && groups[q] === group) { labels[q] = count; queue[tail++] = q; }
      }
    }
  }
  return { labels, count };
}

function root(parent, a) { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; }
function colorDistance(lab, a, b) { const x = a * 3, y = b * 3; return Math.hypot(lab[x] - lab[y], lab[x + 1] - lab[y + 1], lab[x + 2] - lab[y + 2]); }
function minRegionSize(image, detail) { return Math.max(3, Math.round(image.n * (.000015 + ((100 - detail) / 100) ** 2 * .0003))); }

function mergeSmall(result, image, minimum) {
  const { labels, count } = result, { width: w, n, lab } = image;
  if (!count) return result;
  const sizes = new Uint32Array(count + 1), parent = Uint32Array.from({ length: count + 1 }, (_, i) => i);
  const best = new Uint32Array(count + 1), distances = new Float32Array(count + 1).fill(Infinity);
  for (const id of labels) if (id) sizes[id]++;
  function candidate(a, b, p, q) {
    if (!a || !b || a === b || sizes[a] >= minimum) return;
    const distance = colorDistance(lab, p, q);
    if (distance < distances[a]) { distances[a] = distance; best[a] = b; }
  }
  for (let i = 0; i < n; i++) {
    if (i % w < w - 1) { candidate(labels[i], labels[i + 1], i, i + 1); candidate(labels[i + 1], labels[i], i + 1, i); }
    if (i + w < n) { candidate(labels[i], labels[i + w], i, i + w); candidate(labels[i + w], labels[i], i + w, i); }
  }
  for (let i = 1; i <= count; i++) {
    if (!best[i]) continue;
    const a = root(parent, i), b = root(parent, best[i]);
    if (a !== b && sizes[a] < minimum) { parent[a] = b; sizes[b] += sizes[a]; }
  }
  const remap = new Uint32Array(count + 1);
  let newCount = 0;
  for (let i = 0; i < n; i++) {
    if (!labels[i]) continue;
    const r = root(parent, labels[i]);
    if (!remap[r]) remap[r] = ++newCount;
    labels[i] = remap[r];
  }
  return { labels, count: newCount };
}

function labClusters(image, detail) {
  const { n, mask, lab, width, height } = image, k = 3 + Math.round(detail / 8);
  const samples = [], stride = Math.max(1, Math.floor(n / 12000));
  for (let i = 0; i < n; i += stride) if (mask[i]) samples.push(i);
  // Sparse foreground can fall between sample strides.
  if (!samples.length) for (let i = 0; i < n; i++) if (mask[i]) { samples.push(i); break; }
  if (!samples.length) return { labels: new Uint32Array(n), count: 0 };
  const centers = [], nearest = new Float32Array(samples.length).fill(Infinity);
  let chosen = samples[0];
  for (let c = 0; c < k; c++) {
    centers.push([lab[3 * chosen], lab[3 * chosen + 1], lab[3 * chosen + 2]]);
    let farthest = -1;
    for (let s = 0; s < samples.length; s++) {
      const p = samples[s] * 3, center = centers[c];
      const dist = (lab[p] - center[0]) ** 2 + (lab[p + 1] - center[1]) ** 2 + (lab[p + 2] - center[2]) ** 2;
      nearest[s] = Math.min(nearest[s], dist);
      if (nearest[s] > farthest) { farthest = nearest[s]; chosen = samples[s]; }
    }
    if (farthest < .001) break;
  }
  const closest = i => {
    let best = 0, distance = Infinity; const p = i * 3;
    for (let c = 0; c < centers.length; c++) {
      const center = centers[c];
      const d = (lab[p] - center[0]) ** 2 + (lab[p + 1] - center[1]) ** 2 + (lab[p + 2] - center[2]) ** 2;
      if (d < distance) { distance = d; best = c; }
    }
    return best;
  };
  for (let iteration = 0; iteration < 10; iteration++) {
    const sums = centers.map(() => [0, 0, 0, 0]);
    for (const i of samples) { const s = sums[closest(i)]; s[0] += lab[i * 3]; s[1] += lab[i * 3 + 1]; s[2] += lab[i * 3 + 2]; s[3]++; }
    for (let c = 0; c < centers.length; c++) if (sums[c][3]) centers[c] = sums[c].slice(0, 3).map(v => v / sums[c][3]);
  }
  const groups = new Uint16Array(n);
  for (let i = 0; i < n; i++) if (mask[i]) groups[i] = closest(i);
  return connectedRegions(groups, mask, width, height);
}

function slic(image, detail) {
  const { n, mask, lab, width: w, height: h } = image;
  const step = Math.max(5, Math.round(Math.sqrt(n / (35 + detail * 6)))) , centers = [];
  for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) {
    let best = -1, distance = Infinity;
    for (let yy = y; yy < Math.min(h, y + step); yy++) for (let xx = x; xx < Math.min(w, x + step); xx++) {
      const i = yy * w + xx, d = (xx - x - step / 2) ** 2 + (yy - y - step / 2) ** 2;
      if (mask[i] && d < distance) { best = i; distance = d; }
    }
    if (best >= 0) centers.push([lab[best * 3], lab[best * 3 + 1], lab[best * 3 + 2], best % w, Math.floor(best / w)]);
  }
  const groups = new Int32Array(n).fill(-1), distances = new Float32Array(n), spatial = (10 / step) ** 2;
  for (let iteration = 0; iteration < 6; iteration++) {
    distances.fill(Infinity);
    for (let c = 0; c < centers.length; c++) {
      const center = centers[c], x0 = Math.max(0, Math.floor(center[3] - 2 * step)), x1 = Math.min(w, Math.ceil(center[3] + 2 * step));
      const y0 = Math.max(0, Math.floor(center[4] - 2 * step)), y1 = Math.min(h, Math.ceil(center[4] + 2 * step));
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const i = y * w + x; if (!mask[i]) continue;
        const d = (lab[3 * i] - center[0]) ** 2 + (lab[3 * i + 1] - center[1]) ** 2 + (lab[3 * i + 2] - center[2]) ** 2 + spatial * ((x - center[3]) ** 2 + (y - center[4]) ** 2);
        if (d < distances[i]) { distances[i] = d; groups[i] = c; }
      }
    }
    const sums = centers.map(() => [0, 0, 0, 0, 0, 0]);
    for (let i = 0; i < n; i++) if (mask[i] && groups[i] >= 0) {
      const s = sums[groups[i]]; s[0] += lab[i * 3]; s[1] += lab[i * 3 + 1]; s[2] += lab[i * 3 + 2]; s[3] += i % w; s[4] += Math.floor(i / w); s[5]++;
    }
    for (let c = 0; c < centers.length; c++) if (sums[c][5]) centers[c] = sums[c].slice(0, 5).map(v => v / sums[c][5]);
  }
  return connectedRegions(groups, mask, w, h);
}

// Felzenszwalb-Huttenlocher style adaptive graph merging; Lab distances bucketed at 0.25 units.
function graphRegions(image, detail) {
  const { n, width: w, height: h, mask, lab } = image;
  const parent = Uint32Array.from({ length: n }, (_, i) => i), sizes = new Uint32Array(n).fill(1), internal = new Float32Array(n);
  const a = new Uint32Array(2 * n), b = new Uint32Array(2 * n), next = new Int32Array(2 * n), heads = new Int32Array(2048).fill(-1);
  let edges = 0;
  function edge(p, q) {
    if (!mask[p] || !mask[q]) return;
    const bucket = Math.min(2047, Math.round(colorDistance(lab, p, q) * 4));
    a[edges] = p; b[edges] = q; next[edges] = heads[bucket]; heads[bucket] = edges++;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (x + 1 < w) edge(i, i + 1); if (y + 1 < h) edge(i, i + w); }
  function join(p, q, weight) { if (sizes[p] < sizes[q]) [p, q] = [q, p]; parent[q] = p; sizes[p] += sizes[q]; internal[p] = Math.max(weight, internal[p], internal[q]); }
  const k = 200 - detail * 1.8;
  for (let bucket = 0; bucket < heads.length; bucket++) for (let e = heads[bucket]; e >= 0; e = next[e]) {
    const p = root(parent, a[e]), q = root(parent, b[e]), weight = bucket / 4;
    if (p !== q && weight <= internal[p] + k / sizes[p] && weight <= internal[q] + k / sizes[q]) join(p, q, weight);
  }
  const minimum = minRegionSize(image, detail);
  for (let bucket = 0; bucket < heads.length; bucket++) for (let e = heads[bucket]; e >= 0; e = next[e]) {
    const p = root(parent, a[e]), q = root(parent, b[e]);
    if (p !== q && (sizes[p] < minimum || sizes[q] < minimum)) join(p, q, bucket / 4);
  }
  const labels = new Uint32Array(n), remap = new Uint32Array(n);
  let count = 0;
  for (let i = 0; i < n; i++) if (mask[i]) { const r = root(parent, i); if (!remap[r]) remap[r] = ++count; labels[i] = remap[r]; }
  return { labels, count };
}

export function cannyEdges(image, detail) {
  const { n, gray, width: w, height: h, mask } = image;
  const blur = new Float32Array(n), magnitude = new Float32Array(n), direction = new Uint8Array(n), thin = new Float32Array(n);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) sum += gray[Math.max(0, Math.min(h - 1, y + dy)) * w + Math.max(0, Math.min(w - 1, x + dx))] * (dx === 0 ? 2 : 1) * (dy === 0 ? 2 : 1);
    blur[y * w + x] = sum / 16;
  }
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const gx = -blur[i - w - 1] + blur[i - w + 1] - 2 * blur[i - 1] + 2 * blur[i + 1] - blur[i + w - 1] + blur[i + w + 1];
    const gy = -blur[i - w - 1] - 2 * blur[i - w] - blur[i - w + 1] + blur[i + w - 1] + 2 * blur[i + w] + blur[i + w + 1];
    magnitude[i] = Math.hypot(gx, gy) / 4;
    direction[i] = ((Math.round(Math.atan2(gy, gx) / (Math.PI / 4)) % 4) + 4) % 4;
  }
  const offsets = [1, w + 1, w, w - 1];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x, d = offsets[direction[i]];
    if (magnitude[i] >= magnitude[i - d] && magnitude[i] >= magnitude[i + d]) thin[i] = magnitude[i];
  }
  const high = 32 - detail * .26, low = high * .4, edges = new Uint8Array(n), queue = new Uint32Array(n);
  let head = 0, tail = 0;
  for (let i = 0; i < n; i++) if (mask[i] && thin[i] >= high) { edges[i] = 255; queue[tail++] = i; }
  while (head < tail) {
    const i = queue[head++], x = i % w, y = Math.floor(i / w);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy, q = yy * w + xx;
      if (xx >= 0 && xx < w && yy >= 0 && yy < h && mask[q] && !edges[q] && thin[q] >= low) { edges[q] = 255; queue[tail++] = q; }
    }
  }
  return edges;
}

export function regionsFromEdges(image, edges, threshold) {
  const { n, mask, width: w, height: h } = image, free = new Uint8Array(n);
  // One-pixel cross dilation bridges small edge gaps before proposing regions.
  for (let i = 0; i < n; i++) {
    const x = i % w;
    free[i] = mask[i] && edges[i] < threshold && (x === 0 || edges[i - 1] < threshold) && (x === w - 1 || edges[i + 1] < threshold) && (i < w || edges[i - w] < threshold) && (i + w >= n || edges[i + w] < threshold) ? 1 : 0;
  }
  const result = connectedRegions(new Uint8Array(n), free, w, h), queue = new Uint32Array(n);
  let head = 0, tail = 0;
  // Grow labels back onto barrier pixels, never across excluded background.
  for (let i = 0; i < n; i++) if (result.labels[i]) queue[tail++] = i;
  function grow() {
    while (head < tail) {
      const p = queue[head++], x = p % w;
      for (const q of [x ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w]) {
        if (q >= 0 && q < n && mask[q] && !result.labels[q]) { result.labels[q] = result.labels[p]; queue[tail++] = q; }
      }
    }
  }
  grow();
  for (let i = 0; i < n; i++) if (mask[i] && !result.labels[i]) { result.labels[i] = ++result.count; queue[tail++] = i; grow(); }
  return result;
}

export function labelEdges(labels, w, h) {
  const edges = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, a = labels[i];
    if (a && (x === 0 || x === w - 1 || y === 0 || y === h - 1 || labels[i - 1] !== a || labels[i + 1] !== a || labels[i - w] !== a || labels[i + w] !== a)) edges[i] = 255;
  }
  return edges;
}

export function analyze(image, id, detail, neuralEdges) {
  let regions, edges;
  if (id === 'lab') regions = labClusters(image, detail);
  else if (id === 'slic') regions = slic(image, detail);
  else if (id === 'graph') regions = graphRegions(image, detail);
  else if (id === 'canny' || id === 'pidi' || id === 'pidi-tiny') {
    edges = id === 'canny' ? cannyEdges(image, detail) : neuralEdges;
    if (!edges || edges.length !== image.n) throw new Error('Mappa bordi non valida.');
    regions = regionsFromEdges(image, edges, id === 'canny' ? 128 : Math.round((.48 - detail * .0035) * 255));
  } else throw new Error('Metodo non riconosciuto.');
  regions = mergeSmall(regions, image, minRegionSize(image, detail));
  edges ||= labelEdges(regions.labels, image.width, image.height);
  for (let i = 0; i < image.n; i++) if (!image.mask[i]) edges[i] = 0;
  return { ...regions, edges, width: image.width, height: image.height };
}

export function labelColor(id) {
  if (!id) return [0, 0, 0];
  const hue = (id * .61803398875) % 1, h = hue * 6, x = 1 - Math.abs(h % 2 - 1);
  const base = h < 1 ? [1,x,0] : h < 2 ? [x,1,0] : h < 3 ? [0,1,x] : h < 4 ? [0,x,1] : h < 5 ? [x,0,1] : [1,0,x];
  return base.map(v => Math.round(55 + v * 185));
}

export function renderResult(result, rgba, mode, opacity = .65, selected = 0) {
  const { labels, edges } = result, out = new Uint8ClampedArray(labels.length * 4), palette = new Map([[0, [0,0,0]]]);
  for (let i = 0; i < labels.length; i++) {
    const id = labels[i], o = i * 4;
    if (!palette.has(id)) palette.set(id, labelColor(id));
    const color = palette.get(id);
    for (let c = 0; c < 3; c++) {
      let value = mode === 'edges' ? edges[i] : mode === 'overlay' ? rgba[o + c] * (1 - (id ? opacity : 0)) + color[c] * (id ? opacity : 0) : color[c];
      if (selected && id !== selected) value *= .18;
      out[o + c] = value;
    }
    out[o + 3] = 255;
  }
  return out;
}

// Lossless 24-bit region IDs, not the display palette. Nearest-neighbor preserves integer labels.
export function exportRaster(result, width, height, type = 'ids', selected = 0) {
  if (width * height > 24e6) throw new Error('Esportazione limitata a 24 MP.');
  const out = new Uint8ClampedArray(width * height * 4), palette = new Map();
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const p = Math.min(result.height - 1, Math.floor(y * result.height / height)) * result.width + Math.min(result.width - 1, Math.floor(x * result.width / width));
    const id = result.labels[p], o = (y * width + x) * 4;
    if (type === 'ids') { out[o] = id & 255; out[o + 1] = (id >>> 8) & 255; out[o + 2] = (id >>> 16) & 255; }
    else if (type === 'palette') { if (!palette.has(id)) palette.set(id, labelColor(id)); out.set(palette.get(id), o); }
    else { const v = type === 'edges' ? result.edges[p] : id === selected ? 255 : 0; out[o] = out[o + 1] = out[o + 2] = v; }
    out[o + 3] = 255;
  }
  return out;
}
