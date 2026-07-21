import { env, pipeline, RawImage } from '@huggingface/transformers';

const [, , inputPath, outputPath = './segmentation/test-results/ormbg-q4-cpu.png'] = process.argv;

if (!inputPath) {
  console.error('Usage: node segmentation/test-model.mjs <input-image> [output-image]');
  process.exitCode = 1;
} else {
  const started = performance.now();
  let lastDownloadPercent = -1;
  const segmenter = await pipeline('background-removal', 'onnx-community/ormbg-ONNX', {
    // The Node runtime names its software execution provider `cpu`; the browser
    // worker uses the equivalent WebAssembly provider named `wasm`.
    device: 'cpu',
    dtype: 'q4',
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
  const output = await segmenter(image);
  console.log(`inference ${((performance.now() - inferenceStarted) / 1000).toFixed(1)}s`);
  const result = output[0].rgba();
  let visiblePixels = 0;
  let opaquePixels = 0;
  const previewData = new Uint8ClampedArray(result.data.length);
  for (let index = 0; index < result.data.length; index += 4) {
    const alpha = result.data[index + 3] / 255;
    if (alpha > 0.05) visiblePixels += 1;
    if (alpha > 0.95) opaquePixels += 1;
    const pixel = index / 4;
    const x = pixel % result.width;
    const y = Math.floor(pixel / result.width);
    const checker = (Math.floor(x / 32) + Math.floor(y / 32)) % 2 === 0 ? 224 : 184;
    previewData[index] = Math.round(result.data[index] * alpha + checker * (1 - alpha));
    previewData[index + 1] = Math.round(result.data[index + 1] * alpha + checker * (1 - alpha));
    previewData[index + 2] = Math.round(result.data[index + 2] * alpha + checker * (1 - alpha));
    previewData[index + 3] = 255;
  }
  const pixelCount = result.width * result.height;
  console.log(`mask visible=${(visiblePixels / pixelCount * 100).toFixed(1)}% opaque=${(opaquePixels / pixelCount * 100).toFixed(1)}%`);
  await result.save(outputPath);
  const previewPath = outputPath.replace(/\.png$/i, '.preview.png');
  await new RawImage(previewData, result.width, result.height, 4).save(previewPath);
  console.log(`saved ${outputPath}`);
  console.log(`saved ${previewPath}`);
  await segmenter.dispose();
}
