import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { env, pipeline, RawImage } from '@huggingface/transformers';

const [, , modelId, dtype, inputDirectory, outputDirectory, limitArg] = process.argv;
if (!modelId || !dtype || !inputDirectory || !outputDirectory) {
  console.error(
    'Usage: node scripts/benchmark-background-removal.mjs '
      + '<model-id> <dtype> <input-directory> <output-directory> [limit]',
  );
  process.exit(1);
}

env.allowLocalModels = false;
env.useBrowserCache = false;
env.backends.onnx.wasm.numThreads = 1;

const limit = limitArg ? Math.max(1, Number(limitArg) || 1) : Number.POSITIVE_INFINITY;
const entries = (await readdir(inputDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && ['.jpg', '.jpeg', '.png', '.webp'].includes(extname(entry.name).toLowerCase()))
  .sort((a, b) => a.name.localeCompare(b.name))
  .slice(0, limit);

await mkdir(outputDirectory, { recursive: true });
const loadStarted = performance.now();
const segmenter = await pipeline('background-removal', modelId, {
  device: 'cpu',
  dtype,
});
const loadSeconds = (performance.now() - loadStarted) / 1000;

const results = [];
for (const entry of entries) {
  const inputPath = join(inputDirectory, entry.name);
  const image = await RawImage.read(inputPath);
  const inferenceStarted = performance.now();
  const output = await segmenter(image);
  const inferenceSeconds = (performance.now() - inferenceStarted) / 1000;
  const result = output[0].rgba();
  const alpha = new Uint8ClampedArray(result.width * result.height);
  let visible = 0;
  let opaque = 0;
  let alphaSum = 0;
  for (let pixel = 0; pixel < alpha.length; pixel += 1) {
    const value = result.data[pixel * 4 + 3];
    alpha[pixel] = value;
    if (value >= 13) visible += 1;
    if (value >= 242) opaque += 1;
    alphaSum += value;
  }

  const stem = basename(entry.name, extname(entry.name));
  const rgbaPath = join(outputDirectory, `${stem}.png`);
  const alphaPath = join(outputDirectory, `${stem}-alpha.png`);
  await result.save(rgbaPath);
  await new RawImage(alpha, result.width, result.height, 1).save(alphaPath);
  const metrics = {
    id: stem,
    inputFile: entry.name,
    input: { width: image.width, height: image.height },
    output: { width: result.width, height: result.height },
    inferenceSeconds,
    alpha: {
      visibleRatio: visible / alpha.length,
      opaqueRatio: opaque / alpha.length,
      mean: alphaSum / alpha.length / 255,
    },
  };
  results.push(metrics);
  await writeFile(join(outputDirectory, `${stem}.json`), `${JSON.stringify(metrics, null, 2)}\n`, 'utf8');
  console.log(
    `${entry.name} inference=${inferenceSeconds.toFixed(3)}s `
      + `visible=${(metrics.alpha.visibleRatio * 100).toFixed(1)}%`,
  );
}

const timings = results.map((item) => item.inferenceSeconds).sort((a, b) => a - b);
const summary = {
  model: modelId,
  dtype,
  runtime: 'Transformers.js / ONNX Runtime CPU, one WASM thread',
  imageCount: results.length,
  loadSeconds,
  inferenceSeconds: {
    mean: timings.reduce((sum, value) => sum + value, 0) / timings.length,
    median: timings[Math.floor(timings.length / 2)],
    p95: timings[Math.min(timings.length - 1, Math.round((timings.length - 1) * 0.95))],
    min: timings[0],
    max: timings.at(-1),
  },
  results,
};
await writeFile(join(outputDirectory, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ loadSeconds, inferenceSeconds: summary.inferenceSeconds }, null, 2));
await segmenter.dispose();
