import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareImage, analyze, connectedRegions, regionsFromEdges, cannyEdges, exportRaster, renderResult } from '../algorithms.js';
import { prepareTensor, cropEdges } from '../neural-input.js';

function fixture(w, h, pixel) {
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) rgba.set(pixel(x, y), (y * w + x) * 4);
  return prepareImage(rgba, w, h);
}
const methods = ['lab', 'slic', 'graph', 'canny'];

test('disconnected areas of the same color receive different IDs; diagonal contact stays separate', () => {
  const result = connectedRegions(new Uint8Array(9), new Uint8Array([1,0,0,0,1,0,0,0,1]), 3, 3);
  assert.equal(result.count, 3);
  assert.deepEqual([...result.labels], [1,0,0,0,2,0,0,0,3]);
});

test('all classical methods preserve the excluded background and separate isolated foreground islands', () => {
  const image = fixture(64, 48, (x, y) => y > 8 && y < 40 && ((x > 4 && x < 26) || (x > 38 && x < 59)) ? [70,170,60,255] : [0,0,0,255]);
  for (const method of methods) {
    const result = analyze(image, method, 50);
    assert.ok(result.count >= 2, method);
    const rightIds = new Set(), leftIds = new Set();
    for (let i = 0; i < image.n; i++) {
      assert.equal(result.labels[i] > 0, !!image.mask[i], `${method}: coverage at ${i}`);
      if (!image.mask[i]) assert.equal(result.edges[i], 0, method);
      else (i % image.width < 32 ? leftIds : rightIds).add(result.labels[i]);
    }
    for (const id of leftIds) assert.ok(!rightIds.has(id), `${method}: merged disconnected islands`);
    assert.equal(new Set(result.labels).size - 1, result.count, method);
  }
});

test('empty, transparent, one-pixel-wide and single-pixel inputs remain valid', () => {
  for (const method of methods) {
    for (const color of [[0,0,0,255], [255,255,255,0]]) {
      const result = analyze(fixture(9, 7, () => color), method, 100);
      assert.equal(result.count, 0, method); assert.ok(result.labels.every(v => v === 0));
    }
    for (const [w,h] of [[1,1], [1,31], [31,1]]) {
      const result = analyze(fixture(w, h, () => [220,220,220,255]), method, 0);
      assert.ok(result.labels.every(v => v > 0), method);
    }
  }
});

test('color and graph methods separate contrasting adjacent blocks', () => {
  const image = fixture(60, 40, x => x < 30 ? [220,20,30,255] : [10,220,80,255]);
  for (const method of ['lab', 'graph']) {
    const result = analyze(image, method, 50);
    assert.notEqual(result.labels[20 * 60 + 15], result.labels[20 * 60 + 45], method);
    assert.equal(result.count, 2, method);
  }
});

test('Canny finds a contrast boundary and edge growth separates its two sides', () => {
  const image = fixture(50, 30, x => x < 25 ? [30,30,30,255] : [230,230,230,255]);
  const edges = cannyEdges(image, 50);
  let atBoundary = 0, elsewhere = 0;
  for (let i = 0; i < edges.length; i++) if (edges[i]) { if (Math.abs(i % 50 - 25) <= 2) atBoundary++; else elsewhere++; }
  assert.ok(atBoundary >= 20); assert.equal(elsewhere, 0);
  const barrier = Uint8Array.from({ length: image.n }, (_, i) => i % 50 === 25 ? 255 : 0);
  const regions = regionsFromEdges(image, barrier, 128);
  assert.equal(regions.count, 2);
  assert.notEqual(regions.labels[15 * 50 + 10], regions.labels[15 * 50 + 40]);
  assert.ok(regions.labels.every(v => v > 0));
});

test('fully covered edge islands retain valid region IDs', () => {
  const image = fixture(4, 3, (x) => x === 2 ? [0,0,0,255] : [100,100,100,255]);
  const result = regionsFromEdges(image, new Uint8Array(12).fill(255), 128);
  assert.equal(result.count, 2);
  assert.notEqual(result.labels[0], result.labels[3]);
  assert.equal(result.labels[2], 0);
});

test('region ID export survives full-resolution enlargement without interpolating labels', () => {
  const result = { width: 2, height: 2, labels: new Uint32Array([0,1,257,65537]), edges: new Uint8Array([0,255,100,10]) };
  const raster = exportRaster(result, 6, 4);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 6; x++) {
    const p = (y * 6 + x) * 4, id = raster[p] + 256 * raster[p+1] + 65536 * raster[p+2];
    assert.equal(id, result.labels[Math.floor(y / 2) * 2 + Math.floor(x / 3)]);
    assert.equal(raster[p+3], 255);
  }
  const mask = exportRaster(result, 2, 2, 'mask', 257);
  assert.deepEqual([...mask].filter((_, i) => i % 4 === 0), [0,0,255,0]);
  assert.throws(() => exportRaster(result, 10000, 10000), /24 MP/);
});

test('overlay preserves excluded original pixels', () => {
  const result = { labels: new Uint32Array([0,1]), edges: new Uint8Array(2) };
  const rgba = new Uint8ClampedArray([7,6,5,255,70,80,90,255]);
  assert.deepEqual([...renderResult(result, rgba, 'overlay').slice(0,4)], [7,6,5,255]);
});

test('CNN preprocessing preserves aspect and uses replicated padding; cropping does not rescale', () => {
  const image = fixture(9, 5, (x,y) => [x*20,y*40,200,255]);
  const { data, dims } = prepareTensor(image.rgba, 9, 5);
  assert.deepEqual(dims, [1,3,8,16]);
  assert.ok(Math.abs(data[0] - (0 - .485) / .229) < 1e-5);
  assert.equal(data[7 * 16 + 15], data[4 * 16 + 8]);
  assert.equal(data[128 + 7 * 16 + 15], data[128 + 4 * 16 + 8]);
  const output = Float32Array.from({ length: 128 }, (_, i) => i / 128);
  const cropped = cropEdges(output, [1,1,8,16], 9, 5);
  assert.equal(cropped.length, 45);
  assert.equal(cropped[44], Math.round(output[4 * 16 + 8] * 255));
  assert.throws(() => cropEdges(new Float32Array(4), [1,1,2,2], 9, 5), /inattese/);
});
