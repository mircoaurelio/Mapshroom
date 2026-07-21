import { AutoProcessor, RawImage, SamModel } from '@huggingface/transformers';

const [, , inputPath, xArg, yArg, outputPath = './segmentation/test-results/slimsam-mask.png'] = process.argv;
if (!inputPath || !xArg || !yArg) {
  console.error('Usage: node segmentation/test-sam.mjs <input-image> <x> <y> [output-mask]');
  process.exitCode = 1;
} else {
  const modelId = 'Xenova/slimsam-77-uniform';
  const started = performance.now();
  const [model, processor] = await Promise.all([
    SamModel.from_pretrained(modelId, { device: 'cpu', dtype: 'q8' }),
    AutoProcessor.from_pretrained(modelId),
  ]);
  console.log(`model-ready ${((performance.now() - started) / 1000).toFixed(1)}s`);
  const image = await RawImage.read(inputPath);
  const inputs = await processor(image, { input_points: [[[Number(xArg), Number(yArg)]]] });
  const inferenceStarted = performance.now();
  const outputs = await model(inputs);
  const masks = await processor.post_process_masks(outputs.pred_masks, inputs.original_sizes, inputs.reshaped_input_sizes, { binarize: true });
  console.log(`inference ${((performance.now() - inferenceStarted) / 1000).toFixed(1)}s`);
  const maskTensor = masks[0];
  const scores = outputs.iou_scores.data;
  let bestMask = 0;
  for (let index = 1; index < scores.length; index += 1) {
    if (scores[index] > scores[bestMask]) bestMask = index;
  }
  const height = maskTensor.dims.at(-2);
  const width = maskTensor.dims.at(-1);
  const pixelCount = width * height;
  const offset = bestMask * pixelCount;
  const maskData = new Uint8ClampedArray(pixelCount);
  let selected = 0;
  for (let index = 0; index < pixelCount; index += 1) {
    if (maskTensor.data[offset + index]) {
      maskData[index] = 255;
      selected += 1;
    }
  }
  await new RawImage(maskData, width, height, 1).save(outputPath);
  console.log(`best-score ${(scores[bestMask] * 100).toFixed(1)}% selected ${(selected / pixelCount * 100).toFixed(1)}%`);
  console.log(`saved ${outputPath}`);
  await model.dispose();
}
