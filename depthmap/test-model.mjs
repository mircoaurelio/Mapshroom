import { env, pipeline, RawImage } from '@huggingface/transformers';

const [, , inputPath, outputPath = './depthmap/test-results/depth-small-cpu.png'] = process.argv;

if (!inputPath) {
  console.error('Usage: node depthmap/test-model.mjs <input-image> [output-image]');
  process.exitCode = 1;
} else {
  const started = performance.now();
  let lastDownloadPercent = -1;
  const estimator = await pipeline('depth-estimation', 'Xenova/depth-anything-small-hf', {
    device: 'cpu',
    dtype: 'q8',
    progress_callback: (progress) => {
      if (progress.status === 'progress' && progress.progress) {
        const percent = Math.round(progress.progress);
        if (percent >= lastDownloadPercent + 10 || percent === 100) {
          lastDownloadPercent = percent;
          console.log(`download ${percent}% ${progress.file ?? ''}`);
        }
      }
    },
  });

  console.log(`model-ready ${((performance.now() - started) / 1000).toFixed(1)}s`);
  const image = await RawImage.read(inputPath);
  console.log(`input ${image.width}x${image.height}`);
  const inferenceStarted = performance.now();
  const output = await estimator(image);
  console.log(`inference ${((performance.now() - inferenceStarted) / 1000).toFixed(1)}s`);
  const depth = output.depth;
  let min = 255;
  let max = 0;
  for (let index = 0; index < depth.data.length; index += 1) {
    min = Math.min(min, depth.data[index]);
    max = Math.max(max, depth.data[index]);
  }
  console.log(`depth ${depth.width}x${depth.height} range=${min}-${max}`);
  await depth.save(outputPath);
  const previewPath = outputPath.replace(/\.png$/i, '.preview.png');
  const previewData = new Uint8ClampedArray(depth.width * depth.height * 4);
  for (let index = 0; index < depth.data.length; index += 1) {
    const value = depth.data[index];
    const offset = index * 4;
    previewData[offset] = value;
    previewData[offset + 1] = value;
    previewData[offset + 2] = value;
    previewData[offset + 3] = 255;
  }
  await new RawImage(previewData, depth.width, depth.height, 4).save(previewPath);
  console.log(`saved ${outputPath}`);
  console.log(`saved ${previewPath}`);
  await estimator.dispose();
}
