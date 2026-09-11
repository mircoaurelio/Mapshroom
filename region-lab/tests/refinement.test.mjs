import test from 'node:test';
import assert from 'node:assert/strict';
import { labelEdges } from '../../src/lib/surfaceMapping/algorithms.js';
import { refineSurfaces, renderRefined } from '../../src/lib/surfaceMapping/refinement.js';
import { exportLighting } from '../../src/lib/surfaceMapping/lighting.js';

function photo(w, h, pixel) {
  return Uint8ClampedArray.from({ length: w * h * 4 }, (_, i) => pixel((i >> 2) % w, Math.floor((i >> 2) / w))[i % 4]);
}
function regions(w, h, at) {
  const labels = Uint32Array.from({ length: w * h }, (_, i) => at(i % w, Math.floor(i / w)));
  return { labels, edges: labelEdges(labels, w, h), width: w, height: h, count: Math.max(...labels) };
}
const light = { style: 'linear', angle: 90, texture: 100, feather: 0, black: 8, palette: 'thermal' };

test('original-pixel texture survives enlargement even when analysis has averaged it away', () => {
  const result = regions(4, 4, () => 1), rgba = photo(4, 4, () => [100, 100, 100, 255]);
  const original = photo(32, 32, x => x % 2 ? [135, 135, 135, 255] : [65, 65, 65, 255]);
  const textured = exportLighting(result, rgba, 32, 32, original, light, true);
  const smooth = exportLighting(result, rgba, 32, 32, original, { ...light, texture: 0 }, true);
  const p = (16 * 32 + 16) * 4;
  assert.ok(textured[p + 4] - textured[p] >= 69, 'one-pixel texture must retain original contrast');
  assert.equal(smooth[p], smooth[p + 4], 'the photo texture slider must still switch detail off');
});

test('guided refinement improves a diagonal boundary while keeping only the original zone IDs', () => {
  const truth = (x, y) => x > .62 * y + 7.3 ? 2 : 1;
  const color = id => id === 1 ? [180, 70, 60, 255] : [60, 140, 190, 255];
  const result = regions(12, 12, (x, y) => truth((x + .5) * 6, (y + .5) * 6));
  const rgba = photo(12, 12, (x, y) => color(result.labels[y * 12 + x]));
  const original = photo(72, 72, (x, y) => color(truth(x + .5, y + .5)));
  const before = result.labels.slice(), refined = refineSurfaces(result, rgba, 72, 72, original);
  let nearestErrors = 0, refinedErrors = 0;
  for (let y = 0; y < 72; y++) for (let x = 0; x < 72; x++) {
    const expected = truth(x + .5, y + .5), id = refined.labels[y * 72 + x];
    nearestErrors += result.labels[Math.floor(y / 6) * 12 + Math.floor(x / 6)] !== expected;
    refinedErrors += id !== expected;
    assert.ok(id === 1 || id === 2);
  }
  assert.ok(refinedErrors < nearestErrors * .75, `${refinedErrors} refined errors vs ${nearestErrors} nearest-neighbor errors`);
  assert.deepEqual(result.labels, before, 'never mutate the analysis used by other outputs');
});

test('transparent holes, black clipping and partial alpha remain consistent across all outputs', () => {
  const result = regions(4, 4, () => 1), rgba = photo(4, 4, () => [100, 100, 100, 255]);
  const original = photo(16, 16, () => [100, 100, 100, 255]);
  original.set([230, 230, 230, 0], 4 * 100);
  original.set([0, 0, 0, 255], 4 * 101);
  original[4 * 102 + 3] = 128;
  const refined = refineSurfaces(result, rgba, 16, 16, original);
  for (const output of ['gradient', 'field', 'regions', 'edges', 'mask']) {
    const pixels = renderRefined(result, rgba, refined, original, light, output, 1);
    assert.deepEqual([...pixels.slice(400, 403)], [0, 0, 0]);
    assert.deepEqual([...pixels.slice(404, 407)], [0, 0, 0]);
  }
  const mask = renderRefined(result, rgba, refined, original, light, 'mask', 1);
  assert.equal(mask[4 * 102], 128, 'preserve antialiased source alpha');
  assert.equal(refineSurfaces(result, rgba, 16, 16, original, 0).labels[101], 1, 'black exclusion can be disabled');
});

test('refined local gradients never borrow another zone’s shading and masks remain exclusive', () => {
  const result = regions(8, 4, x => x < 4 ? 1 : 2), rgba = photo(8, 4, () => [100, 100, 100, 255]);
  const original = photo(64, 32, () => [100, 100, 100, 255]);
  const refined = refineSurfaces(result, rgba, 64, 32, original);
  const field = renderRefined(result, rgba, refined, original, { ...light, angle: 0, texture: 0 }, 'field');
  assert.ok(field[(16 * 64 + 31) * 4] > 220);
  assert.ok(field[(16 * 64 + 32) * 4] < 50);
  const a = renderRefined(result, rgba, refined, original, light, 'mask', 1);
  const b = renderRefined(result, rgba, refined, original, light, 'mask', 2);
  for (let i = 0; i < 64 * 32; i++) assert.equal(a[i * 4] + b[i * 4], 255);
});

test('empty, tiny and already-native images stay valid without growing new regions', () => {
  for (const [w, h, id] of [[1, 1, 1], [1, 7, 1], [7, 1, 0], [4, 4, 0]]) {
    const result = regions(w, h, () => id), rgba = photo(w, h, () => [100, 100, 100, 255]);
    assert.deepEqual(refineSurfaces(result, rgba, w, h, rgba).labels, result.labels);
    const doubled = refineSurfaces(result, rgba, w * 2, h * 2, photo(w * 2, h * 2, () => [100, 100, 100, 255]));
    assert.ok(doubled.labels.every(value => value === id));
  }
});
