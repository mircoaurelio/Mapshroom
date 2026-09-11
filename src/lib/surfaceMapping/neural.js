// Loaded only when CNNs are selected. The runtime and models are local static assets.
import { prepareTensor, cropEdges } from './neural-input.js';
import { runtimeAssets, modelAssets } from './runtime-assets.js';

export const MODEL_REVISION = '6b3f899da74e697a7d2c2e7cba10cfce057d6e55';
export const MODELS = {
  'pidi-tiny': { file: 'table5_pidinet_tiny.onnx', graphBytes: 86530, weightBytes: 307120 },
  pidi: { file: 'pidinet_table5.onnx', graphBytes: 144170, weightBytes: 2881392 },
};
const WASM_BYTES = 11133407;
const memory = new Map();
let runtimePromise;

async function asset(url, expected, progress, counters) {
  if (memory.has(url)) { counters.memoryBytes += expected; return memory.get(url); }
  let cache, response;
  try {
    cache = await caches.open(`mapshroom-region-lab-${MODEL_REVISION}-ort-89f8206ba4`);
    response = await cache.match(url);
    if (response) counters.cacheBytes += expected;
  } catch { /* Storage restrictions must not prevent local inference. */ }
  if (!response) {
    progress(`Caricamento locale: ${url.split('/').pop()}…`);
    response = await fetch(url, { signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`File del modello non disponibile (${response.status}). Riavvia il server e riprova.`);
    counters.fetchedBytes += expected;
  }
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength !== expected) {
    if (cache) await cache.delete(url).catch(() => {});
    throw new Error(`File incompleto: ${url.split('/').pop()}. Premi Confronta per riprovare.`);
  }
  if (cache) await cache.put(url, new Response(bytes)).catch(() => {});
  memory.set(url, bytes);
  return bytes;
}

async function runtime(progress, counters) {
  if (!runtimePromise) {
    runtimePromise = (async () => {
      progress('Preparazione del motore WASM · circa 11,2 MB al primo uso…');
      const moduleUrl = runtimeAssets.module;
      const ort = await import(/* @vite-ignore */ moduleUrl);
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.proxy = false;
      ort.env.wasm.wasmPaths = { mjs: runtimeAssets.glue, wasm: runtimeAssets.wasm };
      ort.env.wasm.wasmBinary = await asset(runtimeAssets.wasm, WASM_BYTES, progress, counters);
      return ort;
    })().catch(error => { runtimePromise = undefined; throw error; });
  }
  return runtimePromise;
}

export async function inferEdges(image, id, _baseUrl, progress = () => {}) {
  const model = MODELS[id];
  if (!model) throw new Error('Modello CNN sconosciuto.');
  const counters = { fetchedBytes: 0, cacheBytes: 0, memoryBytes: 0 };
  const loadStart = performance.now();
  const ort = await runtime(progress, counters);
  const graph = await asset(modelAssets[id].graph, model.graphBytes, progress, counters);
  const weights = await asset(modelAssets[id].weights, model.weightBytes, progress, counters);
  progress(`Preparazione ${id === 'pidi-tiny' ? 'PiDiNet Tiny' : 'PiDiNet'}…`);
  let session, input, output;
  try {
    session = await ort.InferenceSession.create(new Uint8Array(graph), {
      executionProviders: ['wasm'],
      externalData: [{ path: `${model.file}.data`, data: new Uint8Array(weights) }],
      graphOptimizationLevel: 'all',
    });
    const loadMs = performance.now() - loadStart;
    progress(`Calcolo CNN locale · ${image.width} × ${image.height} px…`);
    const inferenceStart = performance.now();
    const prepared = prepareTensor(image.rgba, image.width, image.height);
    input = new ort.Tensor('float32', prepared.data, prepared.dims);
    output = await session.run({ image: input }, ['fused']);
    const edges = cropEdges(output.fused.data, output.fused.dims, image.width, image.height);
    return {
      edges,
      metrics: {
        loadMs, inferenceMs: performance.now() - inferenceStart,
        modelBytes: model.graphBytes + model.weightBytes,
        runtimeWasmBytes: WASM_BYTES, ...counters,
        source: `https://huggingface.co/bdck/PiDiNet_ONNX/tree/${MODEL_REVISION}`,
        runtimeVersion: 'onnxruntime-web 1.22.0-dev.20250409-89f8206ba4 · WASM · 1 thread',
        preprocessing: 'RGB ImageNet mean/std; edge replication to multiples of 8; fused output cropped back to analysis dimensions',
      },
    };
  } finally {
    input?.dispose();
    if (output) for (const tensor of Object.values(output)) tensor.dispose();
    await session?.release();
  }
}
