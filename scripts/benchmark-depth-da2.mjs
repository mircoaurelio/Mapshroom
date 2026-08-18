import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';
import { env, pipeline, RawImage } from '@huggingface/transformers';

function quantile(sorted, amount) {
  const position = (sorted.length - 1) * amount;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const mix = position - lower;
  return sorted[lower] * (1 - mix) + sorted[upper] * mix;
}

function resizeBilinear(source, sourceWidth, sourceHeight, targetWidth, targetHeight) {
  const target = new Float32Array(targetWidth * targetHeight);
  for (let y = 0; y < targetHeight; y += 1) {
    const sourceY = ((y + 0.5) * sourceHeight) / targetHeight - 0.5;
    const y0 = Math.max(0, Math.floor(sourceY));
    const y1 = Math.min(sourceHeight - 1, y0 + 1);
    const fy = Math.max(0, sourceY - y0);
    for (let x = 0; x < targetWidth; x += 1) {
      const sourceX = ((x + 0.5) * sourceWidth) / targetWidth - 0.5;
      const x0 = Math.max(0, Math.floor(sourceX));
      const x1 = Math.min(sourceWidth - 1, x0 + 1);
      const fx = Math.max(0, sourceX - x0);
      const top = source[y0 * sourceWidth + x0] * (1 - fx) + source[y0 * sourceWidth + x1] * fx;
      const bottom = source[y1 * sourceWidth + x0] * (1 - fx) + source[y1 * sourceWidth + x1] * fx;
      target[y * targetWidth + x] = top * (1 - fy) + bottom * fy;
    }
  }
  return target;
}

function percentile(values, amount) {
  const sorted = [...values].sort((a, b) => a - b);
  return quantile(sorted, amount);
}

async function findImages(inputPath) {
  const inputStat = await stat(inputPath);
  if (inputStat.isFile()) return [inputPath];
  const entries = await readdir(inputPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && ['.jpg', '.jpeg', '.png', '.webp'].includes(extname(entry.name).toLowerCase()))
    .map((entry) => join(inputPath, entry.name))
    .sort();
}

async function benchmarkImage(estimator, inputPath, outputPath, loadSeconds) {
  const image = await RawImage.read(inputPath);
  const inferenceStarted = performance.now();
  const output = await estimator(image);
  const inferenceSeconds = (performance.now() - inferenceStarted) / 1000;
  const raw = output.predicted_depth;
  if (!raw?.data) throw new Error('The model did not return predicted_depth');
  const rawWidth = raw.dims.at(-1);
  const rawHeight = raw.dims.at(-2);
  const sorted = Float32Array.from(raw.data).sort();
  const q01 = quantile(sorted, 0.01);
  const q99 = quantile(sorted, 0.99);
  const range = Math.max(q99 - q01, 1e-6);
  const normalizedRaw = Float32Array.from(raw.data, (value) => Math.max(0, Math.min(1, (value - q01) / range)));
  const normalized = resizeBilinear(normalizedRaw, rawWidth, rawHeight, image.width, image.height);
  const previewPixels = new Uint8ClampedArray(image.width * image.height * 4);
  let sum = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    const value = Math.round(normalized[index] * 255);
    const offset = index * 4;
    previewPixels[offset] = value;
    previewPixels[offset + 1] = value;
    previewPixels[offset + 2] = value;
    previewPixels[offset + 3] = 255;
    sum += value;
  }

  await mkdir(dirname(outputPath), { recursive: true });
  await new RawImage(previewPixels, image.width, image.height, 4).save(outputPath);
  const rawPath = outputPath.slice(0, -extname(outputPath).length) + '.f32';
  await writeFile(rawPath, Buffer.from(raw.data.buffer, raw.data.byteOffset, raw.data.byteLength));

  const metrics = {
    inputFile: basename(inputPath),
    model: modelId,
    runtime: 'Transformers.js / ONNX Runtime CPU, q8, one WASM thread',
    input: { width: image.width, height: image.height },
    rawOutput: { width: rawWidth, height: rawHeight, file: basename(rawPath) },
    output: { width: image.width, height: image.height },
    loadSeconds,
    inferenceSeconds,
    rawDepthRange: { q01, q99 },
    previewRange: { min: 0, max: 255, mean: sum / normalized.length },
  };
  const metricsPath = outputPath.slice(0, -extname(outputPath).length) + '.json';
  await writeFile(metricsPath, `${JSON.stringify(metrics, null, 2)}\n`, 'utf8');
  console.log(`${basename(inputPath)} inference=${inferenceSeconds.toFixed(3)}s output=${image.width}x${image.height}`);
  return metrics;
}

const [, , inputPath, requestedOutputPath = 'tmp/depth-benchmark/output/da2-v2-small.png'] = process.argv;

if (!inputPath) {
  console.error('Usage: node scripts/benchmark-depth-da2.mjs <input-image-or-directory> [output-image-or-directory]');
  process.exit(1);
}

env.allowLocalModels = false;
// Node has no Cache Storage API. The library's filesystem cache still keeps
// repeated benchmark runs warm without changing the browser configuration.
env.useBrowserCache = false;
env.backends.onnx.wasm.numThreads = 1;

const modelId = 'onnx-community/depth-anything-v2-small';
const loadStarted = performance.now();
const estimator = await pipeline('depth-estimation', modelId, {
  device: 'cpu',
  dtype: 'q8',
});
const loadSeconds = (performance.now() - loadStarted) / 1000;

const images = await findImages(inputPath);
const inputIsDirectory = (await stat(inputPath)).isDirectory();
const suiteOutputDirectory = inputIsDirectory ? requestedOutputPath : dirname(requestedOutputPath);
const results = [];
for (const imagePath of images) {
  const outputPath = inputIsDirectory
    ? join(suiteOutputDirectory, `${basename(imagePath, extname(imagePath))}.png`)
    : requestedOutputPath;
  results.push(await benchmarkImage(estimator, imagePath, outputPath, loadSeconds));
}

if (inputIsDirectory) {
  const timings = results.map((item) => item.inferenceSeconds);
  const summary = {
    model: modelId,
    imageCount: results.length,
    loadSeconds,
    inferenceSeconds: {
      mean: timings.reduce((sum, value) => sum + value, 0) / timings.length,
      median: percentile(timings, 0.5),
      p95: percentile(timings, 0.95),
      min: Math.min(...timings),
      max: Math.max(...timings),
    },
    results,
  };
  await mkdir(suiteOutputDirectory, { recursive: true });
  const summaryPath = join(suiteOutputDirectory, 'summary.json');
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(summary.inferenceSeconds, null, 2));
  console.log(`saved ${summaryPath}`);
}

await estimator.dispose();
