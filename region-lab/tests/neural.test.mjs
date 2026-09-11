import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inferEdges, MODELS } from '../neural.js';
import { prepareImage, analyze } from '../algorithms.js';

// Uses the actual vendored browser WASM engine, not onnxruntime-node or a model mock.
// Node's fetch lacks file://; only the static asset transport is adapted for this test.
test('both pinned CNNs run with the shipped WASM runtime, produce spatial edges and reuse weights', async () => {
  const originalFetch = globalThis.fetch;
  const base = new URL('../../src/lib/surfaceMapping/assets/', import.meta.url);
  const fetched = [];
  globalThis.fetch = async url => {
    assert.ok(String(url).startsWith(base.href), 'Inference must never send a request outside local assets');
    fetched.push(String(url));
    return new Response(await readFile(new URL(url)));
  };
  try {
    const w = 53, h = 41, rgba = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = x > 12 && x < 40 && y > 8 && y < 32 ? 230 : 20;
      rgba.set([v, v, v, 255], (y * w + x) * 4);
    }
    const image = prepareImage(rgba, w, h);
    for (const id of Object.keys(MODELS)) {
      const { edges, metrics } = await inferEdges(image, id, base.href);
      assert.equal(edges.length, w * h);
      assert.ok(Math.max(...edges) - Math.min(...edges) > 40, `${id} must produce meaningful variation`);
      assert.equal(metrics.modelBytes, MODELS[id].graphBytes + MODELS[id].weightBytes);
      const result = analyze(image, id, 50, edges);
      assert.ok(result.labels.every(v => v > 0));
      const fetchCount = fetched.length;
      const repeated = await inferEdges(image, id, base.href);
      assert.equal(fetched.length, fetchCount, 'Repeated analysis should reuse local model buffers');
      assert.equal(repeated.metrics.fetchedBytes, 0);
      assert.deepEqual(repeated.edges, edges);
    }
  } finally { globalThis.fetch = originalFetch; }
});
