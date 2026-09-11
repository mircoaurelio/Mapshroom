import { prepareImage, analyze } from './algorithms.js';
import { prepareSurface, shapeRegions, finishSurface } from './surfaces.js';

self.onmessage = async ({ data }) => {
  const send = message => self.postMessage({ runId: data.runId, ...message });
  try {
    const prepStart = performance.now();
    const original = prepareImage(new Uint8ClampedArray(data.rgba), data.width, data.height, data.settings.black);
    let image = original;
    const surface = data.settings.profile === 'surface';
    if (surface) image = prepareSurface(image, data.settings.smoothing);
    send({ type: 'prepared', preparationMs: performance.now() - prepStart, active: image.active });
    for (const id of data.methods) {
      send({ type: 'start', id });
      try {
        let neuralEdges, modelMetrics = { loadMs: 0, inferenceMs: 0, modelBytes: 0, source: 'nessun modello' };
        if (id.startsWith('pidi')) {
          const { inferEdges } = await import('./neural.js');
          const neural = await inferEdges(original, id, data.baseUrl, message => send({ type: 'progress', id, message }));
          neuralEdges = neural.edges; modelMetrics = neural.metrics;
        }
        const start = performance.now();
        // Compact superpixels ensure proposals cover the whole subject before macro merging.
        // Closed-contour flooding or a single large graph component can otherwise absorb a stage.
        let result = id === 'shape' ? shapeRegions(image, data.settings.zones) : analyze(image, surface ? 'slic' : id, data.settings.detail, neuralEdges);
        if (surface) result = finishSurface(result, image, data.settings.zones, data.settings.smoothing, neuralEdges);
        send({ type: 'result', id, result, metrics: { ...modelMetrics, analysisMs: performance.now() - start, active: image.active } });
      } catch (error) { send({ type: 'method-error', id, message: error?.message || String(error) }); }
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    send({ type: 'done' });
  } catch (error) { send({ type: 'error', message: error?.message || String(error) }); }
};
