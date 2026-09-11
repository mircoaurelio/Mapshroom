import { prepareImage, analyze } from './surfaceMapping/algorithms.js';
import { prepareSurface, shapeRegions, finishSurface } from './surfaceMapping/surfaces.js';
import { refineSurfaces, renderRefined } from './surfaceMapping/refinement.js';
import { suggestSurfaceSettings, fitProcessingSize, connectedDarkAlpha } from './assetVariantRules.js';

let acknowledge;
self.onmessage = ({ data }) => {
  if (data.type === 'ack') { acknowledge?.(); acknowledge = null; return; }
  if (data.type === 'run') void run(data);
};

async function run({ source, outputs, profile, ai }) {
  let bitmap, model, canvas;
  let currentKind = outputs[0];
  const send = message => self.postMessage({ kind: currentKind, ...message });
  try {
    bitmap = await createImageBitmap(source);
    // Never allocate full-resolution editing buffers before applying the budget.
    const size = fitProcessingSize(bitmap.width, bitmap.height, profile);
    const { width, height } = size;
    canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('This browser cannot create image previews.');
    ctx.imageSmoothingQuality = 'high'; ctx.drawImage(bitmap, 0, 0, width, height); bitmap.close(); bitmap = null;
    const original = ctx.getImageData(0, 0, width, height).data;
    const analysisScale = Math.min(1, (profile.mobile ? 640 : 960) / Math.max(width, height));
    const sw = Math.max(1, Math.round(width * analysisScale)), sh = Math.max(1, Math.round(height * analysisScale));
    const small = new OffscreenCanvas(sw, sh), sc = small.getContext('2d', { willReadFrequently: true });
    sc.drawImage(canvas, 0, 0, sw, sh);
    const rgba = sc.getImageData(0, 0, sw, sh).data;
    small.width = small.height = 1;
    const settings = suggestSurfaceSettings(rgba, sw, sh, profile.mobile);
    send({ type: 'suggestion', settings });
    let result, refined, mask;
    // RGB stays unchanged for depth; background alpha is applied afterwards.
    const aiBlob = await canvas.convertToBlob({ type: 'image/png' });
    for (const kind of outputs) {
      currentKind = kind;
      send({ type: 'phase', message: kind === 'depth' ? 'Preparing depth model…' : kind === 'background' ? 'Checking background…' : 'Finding smooth zones…' });
      let pixels, method;
      try {
        if (kind !== 'background' && kind !== 'depth') {
          if (!result) {
            const image = prepareSurface(prepareImage(rgba, sw, sh, settings.black), settings.smoothing);
            result = settings.method === 'shape' ? shapeRegions(image, settings.zones) : analyze(image, 'slic', 50);
            result = finishSurface(result, image, settings.zones, settings.smoothing);
            if (!result.count) throw new Error('No zones found. Open Adjust to change the dark-background threshold.');
            refined = refineSurfaces(result, rgba, width, height, original, settings.black);
          }
          const output = kind === 'segmentation' ? 'regions' : kind;
          pixels = renderRefined(result, rgba, refined, original, { style: 'radial', palette: 'thermal', angle: 90, texture: 100, feather: 1, black: settings.black }, output, 0);
          method = `${settings.method === 'shape' ? 'Shape' : 'Color'} · ${result.count} zones`;
        } else if (kind === 'background' && (settings.hasAlpha || settings.darkBackground)) {
          mask = settings.hasAlpha ? Uint8ClampedArray.from({ length: width * height }, (_, i) => original[i * 4 + 3]) : connectedDarkAlpha(original, width, height);
          pixels = original.slice();
          for (let i = 0; i < mask.length; i++) pixels[i * 4 + 3] = mask[i];
          method = settings.hasAlpha ? 'Existing transparency' : 'Connected dark background';
        } else {
          if (!ai) throw new Error(kind === 'depth' ? 'AI depth is off on this device. Enable AI tools in Outputs to try it manually.' : 'This background needs AI. Enable AI tools in Outputs, or use the mask editor.');
          // Release the surface working set before loading an ONNX session.
          result = null; refined = null;
          const { env, pipeline, RawImage } = await import('@huggingface/transformers');
          env.allowLocalModels = false; env.useBrowserCache = true; env.backends.onnx.wasm.numThreads = 1;
          const depth = kind === 'depth';
          model = await pipeline(depth ? 'depth-estimation' : 'background-removal', depth ? 'onnx-community/depth-anything-v2-small' : 'onnx-community/ormbg-ONNX', {
            device: 'wasm', dtype: 'q8', progress_callback: p => {
              if (p.status === 'progress' && p.total > 0) send({ type: 'download', loaded: p.loaded, total: p.total, file: p.file });
            },
          });
          send({ type: 'phase', message: depth ? 'Generating depth…' : 'Removing background…' });
          const input = await RawImage.fromBlob(aiBlob);
          const output = await model(input);
          const image = depth ? output.depth.rgba() : output[0].rgba();
          const temp = new OffscreenCanvas(image.width, image.height), tc = temp.getContext('2d');
          tc.putImageData(new ImageData(new Uint8ClampedArray(image.data), image.width, image.height), 0, 0);
          ctx.clearRect(0, 0, width, height); ctx.drawImage(temp, 0, 0, width, height); temp.width = temp.height = 1;
          pixels = ctx.getImageData(0, 0, width, height).data;
          if (depth) {
            for (let i = 0; i < width * height; i++) pixels[i * 4 + 3] = mask?.[i] ?? original[i * 4 + 3];
          } else {
            mask = new Uint8ClampedArray(width * height);
            for (let i = 0; i < mask.length; i++) { mask[i] = pixels[i * 4 + 3]; pixels[i * 4] = original[i * 4]; pixels[i * 4 + 1] = original[i * 4 + 1]; pixels[i * 4 + 2] = original[i * 4 + 2]; }
          }
          method = depth ? 'Depth Anything V2 Small · q8' : 'ORMBG · q8';
          await model.dispose(); model = null;
        }
        ctx.putImageData(new ImageData(pixels, width, height), 0, 0);
        send({ type: 'phase', message: 'Saving version…' });
        const blob = await canvas.convertToBlob({ type: 'image/png' });
        const saved = new Promise(resolve => { acknowledge = resolve; });
        send({ type: 'result', blob, width, height, method });
        await saved;
      } catch (error) {
        if (model) { try { await model.dispose(); } catch { /* Worker termination is the final cleanup. */ } model = null; }
        send({ type: 'error', message: error?.message || 'Could not generate this version. Try a smaller image.' });
      }
    }
    send({ type: 'done' });
  } catch (error) { send({ type: 'fatal', message: error?.message || 'Could not open the image.' }); }
  finally { bitmap?.close(); if (canvas) canvas.width = canvas.height = 1; if (model) await model.dispose().catch(() => {}); }
}
