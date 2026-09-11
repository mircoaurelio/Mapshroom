// Matches PiDiNet's original TestDataset and the ONNX conversion's model card.
export function prepareTensor(rgba, width, height) {
  if (rgba.length !== width * height * 4 || width < 1 || height < 1) throw new Error('Input CNN non valido.');
  const paddedWidth = Math.max(8, Math.ceil(width / 8) * 8), paddedHeight = Math.max(8, Math.ceil(height / 8) * 8);
  const n = paddedWidth * paddedHeight, data = new Float32Array(n * 3);
  const mean = [.485, .456, .406], std = [.229, .224, .225];
  for (let y = 0; y < paddedHeight; y++) for (let x = 0; x < paddedWidth; x++) {
    const p = (Math.min(y, height - 1) * width + Math.min(x, width - 1)) * 4;
    const alpha = rgba[p + 3] / 255;
    for (let c = 0; c < 3; c++) data[c * n + y * paddedWidth + x] = (rgba[p + c] * alpha / 255 - mean[c]) / std[c];
  }
  return { data, dims: [1, 3, paddedHeight, paddedWidth] };
}

export function cropEdges(data, dims, width, height) {
  if (dims.length !== 4 || dims[0] !== 1 || dims[1] !== 1 || dims[2] < height || dims[3] < width || data.length !== dims[2] * dims[3]) throw new Error('Dimensioni dei bordi CNN inattese.');
  const edges = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const value = data[y * dims[3] + x];
    if (!Number.isFinite(value)) throw new Error('Il modello ha prodotto valori non validi.');
    edges[y * width + x] = Math.round(Math.max(0, Math.min(1, value)) * 255);
  }
  return edges;
}
