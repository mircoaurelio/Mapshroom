import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { AutoProcessor, env, RawImage, SamModel } from '@huggingface/transformers';

const [, , rgbDirectory, maskDirectory, outputDirectory, limitArg = '10', mode = 'full'] = process.argv;
if (!rgbDirectory || !maskDirectory || !outputDirectory) {
  console.error(
    'Usage: node scripts/benchmark-smart-pen-sam.mjs '
      + '<rgb-directory> <mask-directory> <output-directory> [limit] [full|cached|cached-one]',
  );
  process.exit(1);
}

env.allowLocalModels = false;
env.useBrowserCache = false;
env.backends.onnx.wasm.numThreads = 1;

const limit = Math.max(1, Number(limitArg) || 10);
const images = (await readdir(rgbDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && ['.jpg', '.jpeg', '.png', '.webp'].includes(extname(entry.name).toLowerCase()))
  .sort((a, b) => a.name.localeCompare(b.name))
  .slice(0, limit);

function maskValue(image, pixel) {
  if (image.channels === 1) return image.data[pixel];
  if (image.channels === 2) return image.data[pixel * 2 + 1];
  if (image.channels === 4) return image.data[pixel * 4 + 3];
  const offset = pixel * image.channels;
  return Math.round(
    0.2126 * image.data[offset]
      + 0.7152 * image.data[offset + 1]
      + 0.0722 * image.data[offset + 2],
  );
}

function findPromptPoint(mask) {
  let weightedX = 0;
  let weightedY = 0;
  let weightSum = 0;
  for (let y = 0; y < mask.height; y += 1) {
    for (let x = 0; x < mask.width; x += 1) {
      const weight = maskValue(mask, y * mask.width + x) >= 128 ? 1 : 0;
      weightedX += x * weight;
      weightedY += y * weight;
      weightSum += weight;
    }
  }
  if (!weightSum) return [Math.floor(mask.width / 2), Math.floor(mask.height / 2)];

  const centerX = weightedX / weightSum;
  const centerY = weightedY / weightSum;
  let bestX = Math.round(centerX);
  let bestY = Math.round(centerY);
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let y = 0; y < mask.height; y += 1) {
    for (let x = 0; x < mask.width; x += 1) {
      if (maskValue(mask, y * mask.width + x) < 128) continue;
      const distance = (x - centerX) ** 2 + (y - centerY) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestX = x;
        bestY = y;
      }
    }
  }
  return [bestX, bestY];
}

await mkdir(outputDirectory, { recursive: true });
const modelId = 'Xenova/slimsam-77-uniform';
const loadStarted = performance.now();
const [model, processor] = await Promise.all([
  SamModel.from_pretrained(modelId, { device: 'cpu', dtype: 'q8' }),
  AutoProcessor.from_pretrained(modelId),
]);
const loadSeconds = (performance.now() - loadStarted) / 1000;

const results = [];
for (const entry of images) {
  const stem = basename(entry.name, extname(entry.name));
  const rgbPath = join(rgbDirectory, entry.name);
  const maskPath = join(maskDirectory, entry.name);
  const [image, groundTruth] = await Promise.all([RawImage.read(rgbPath), RawImage.read(maskPath)]);
  const point = findPromptPoint(groundTruth);
  const preprocessStarted = performance.now();
  const inputs = await processor(image, { input_points: [[point]] });
  const preprocessSeconds = (performance.now() - preprocessStarted) / 1000;
  let embeddingSeconds = 0;
  let modelInputs = inputs;
  if (mode === 'cached' || mode === 'cached-one') {
    const embeddingStarted = performance.now();
    const embeddings = await model.get_image_embeddings(inputs);
    embeddingSeconds = (performance.now() - embeddingStarted) / 1000;
    modelInputs = { ...inputs, ...embeddings };
  }
  const inferenceStarted = performance.now();
  const outputs = await model(modelInputs);
  const inferenceSeconds = (performance.now() - inferenceStarted) / 1000;
  const scores = outputs.iou_scores.data;
  let bestMask = 0;
  for (let index = 1; index < scores.length; index += 1) {
    if (scores[index] > scores[bestMask]) bestMask = index;
  }
  const postprocessInput = mode === 'cached-one'
    ? outputs.pred_masks.slice(null, null, [bestMask, bestMask + 1], null, null)
    : outputs.pred_masks;
  const postprocessStarted = performance.now();
  const masks = await processor.post_process_masks(
    postprocessInput,
    inputs.original_sizes,
    inputs.reshaped_input_sizes,
    { binarize: true },
  );
  const maskTensor = masks[0];
  const outputMask = mode === 'cached-one' ? 0 : bestMask;
  const height = maskTensor.dims.at(-2);
  const width = maskTensor.dims.at(-1);
  const pixelCount = width * height;
  const output = new Uint8ClampedArray(pixelCount);
  let selected = 0;
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    if (maskTensor.data[outputMask * pixelCount + pixel]) {
      output[pixel] = 255;
      selected += 1;
    }
  }
  const postprocessSeconds = (performance.now() - postprocessStarted) / 1000;
  await new RawImage(output, width, height, 1).save(join(outputDirectory, `${stem}-alpha.png`));
  const result = {
    id: stem,
    point,
    bestScore: scores[bestMask],
    selectedRatio: selected / pixelCount,
    preprocessSeconds,
    embeddingSeconds,
    inferenceSeconds,
    postprocessSeconds,
    totalSeconds: preprocessSeconds + embeddingSeconds + inferenceSeconds + postprocessSeconds,
  };
  results.push(result);
  console.log(
    `${entry.name} point=${point.join(',')} score=${result.bestScore.toFixed(3)} `
      + `embedding=${embeddingSeconds.toFixed(3)}s decoder=${inferenceSeconds.toFixed(3)}s `
      + `total=${result.totalSeconds.toFixed(3)}s`,
  );
}

function aggregate(key) {
  const values = results.map((item) => item[key]).sort((a, b) => a - b);
  return {
    mean: values.reduce((sum, value) => sum + value, 0) / values.length,
    median: values[Math.floor(values.length / 2)],
    p95: values[Math.min(values.length - 1, Math.round((values.length - 1) * 0.95))],
    min: values[0],
    max: values.at(-1),
  };
}

const summary = {
  model: modelId,
  dtype: 'q8',
  mode,
  runtime: 'Transformers.js / ONNX Runtime CPU, one WASM thread',
  loadSeconds,
  imageCount: results.length,
  preprocessing: aggregate('preprocessSeconds'),
  embedding: aggregate('embeddingSeconds'),
  inference: aggregate('inferenceSeconds'),
  postprocessing: aggregate('postprocessSeconds'),
  total: aggregate('totalSeconds'),
  score: aggregate('bestScore'),
  results,
};
await writeFile(join(outputDirectory, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(summary, null, 2));
await model.dispose();
