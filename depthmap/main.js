const $ = (selector) => document.querySelector(selector);

const VIEW_MODES = {
  bw: { id: 'grayscale', label: 'bw', invert: false, contrast: 1, gamma: 1, binary: false },
  rgb: { id: 'turbo', label: 'rgb', invert: false, contrast: 1, gamma: 1, binary: false },
};

const elements = {
  fileInput: $('#fileInput'),
  dropzone: $('#dropzone'),
  emptyUpload: $('#emptyUploadButton'),
  sample: $('#sampleButton'),
  estimate: $('#estimateButton'),
  downloadDepth: $('#downloadDepthButton'),
  downloadAll: $('#downloadAllButton'),
  downloadOverlay: $('#downloadOverlayButton'),
  canvas: $('#resultCanvas'),
  original: $('#originalImage'),
  originalLayer: $('#originalLayer'),
  compare: $('#compareRange'),
  handle: $('#compareHandle'),
  empty: $('#emptyState'),
  canvasArea: $('#canvasArea'),
  dropOverlay: $('#dropOverlay'),
  busy: $('#busyOverlay'),
  busyTitle: $('#busyTitle'),
  busyDetail: $('#busyDetail'),
  progress: $('#progressBar'),
  fileName: $('#fileName'),
  fileMeta: $('#fileMeta'),
  model: $('#modelSelect'),
  modelBadge: $('#modelBadge'),
  modelDescription: $('#modelDescription'),
  autoEstimate: $('#autoEstimate'),
  deviceLabel: $('#deviceLabel'),
  deviceToggle: $('#deviceToggle'),
  refine: $('#refinePanel'),
  toast: $('#toast'),
  depthStrength: $('#depthStrengthRange'),
  definition: $('#definitionRange'),
  crispMask: $('#crispMask'),
  contrast: $('#contrastRange'),
  gamma: $('#gammaRange'),
  blend: $('#blendRange'),
  viewModeToggle: $('#viewModeToggle'),
  modeBw: $('#modeBw'),
  modeRgb: $('#modeRgb'),
};

const modelInfo = {
  'Xenova/depth-anything-small-hf': ['CPU TESTED', 'Fast default for sculptures, rooms, and mixed scenes.'],
  'onnx-community/depth-anything-v2-small': ['V2 SMALL', 'Newer Depth Anything V2 weights with sharper relief.'],
  'Xenova/depth-anything-large-hf': ['HIGH DETAIL', 'Larger model with finer depth transitions; slower on CPU.'],
};

const FUNNY_LOAD_LINES = [
  'Bribing tiny browser elves with espresso…',
  'Teaching mushrooms to feel near and far…',
  'Unfolding a pocket-sized depth spell…',
  'Convincing ONNX to stop being mysterious…',
  'Warming up the pixel gossip network…',
  'Herding weights into a cozy browser den…',
  'Polishing a crystal ball full of Z-buffer dreams…',
  'Asking the void politely for smarter relief…',
];

function funnyLoadDetail(percent = 0) {
  const line = FUNNY_LOAD_LINES[Math.floor((Math.max(0, percent) / 12.5)) % FUNNY_LOAD_LINES.length];
  const tip = percent < 55
    ? 'First time is slower — after that it usually zips.'
    : 'Almost caffeinated.';
  return `${line} ${Math.round(percent)}% · ${tip}`;
}

let sourceFile = null;
let sourceUrl = '';
let sourceWidth = 1;
let sourceHeight = 1;
let imageWidth = 0;
let imageHeight = 0;
let depthWidth = 0;
let depthHeight = 0;
let depthData = null;
let rawDepthData = null;
let rawDepthWidth = 0;
let rawDepthHeight = 0;
let depthStats = null;
let sourceLuminance = null;
let viewMode = 'bw';
let busy = false;
let toastTimer;

const worker = new Worker(new URL('./depth.worker.js', import.meta.url), { type: 'module' });

elements.deviceLabel.textContent = 'WASM · CPU safe mode';

function activePreset(mode = viewMode) {
  return VIEW_MODES[mode] || VIEW_MODES.bw;
}

function updateModelUI() {
  const [badge, description] = modelInfo[elements.model.value];
  elements.modelBadge.textContent = badge;
  elements.modelDescription.textContent = description;
  elements.estimate.disabled = !sourceFile;
  elements.deviceToggle.disabled = true;
  elements.deviceToggle.textContent = 'CPU SAFE';
  elements.deviceLabel.textContent = 'WASM · CPU safe mode';
}

function showToast(message, isError = false) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.toggle('error', isError);
  elements.toast.classList.add('visible');
  toastTimer = setTimeout(() => elements.toast.classList.remove('visible'), 4200);
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function setExportDisabled(disabled) {
  elements.downloadDepth.disabled = disabled;
  elements.downloadAll.disabled = disabled;
  elements.downloadOverlay.disabled = disabled;
}

function sampleDepth(x, y) {
  const width = rawDepthData?.length ? rawDepthWidth : depthWidth;
  const height = rawDepthData?.length ? rawDepthHeight : depthHeight;
  const source = rawDepthData?.length ? rawDepthData : depthData;
  const divisor = rawDepthData?.length ? 1 : 255;
  const fx = Math.max(0, Math.min(width - 1.001, x * width / imageWidth));
  const fy = Math.max(0, Math.min(height - 1.001, y * height / imageHeight));
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const tx = fx - x0;
  const ty = fy - y0;
  const v00 = source[y0 * width + x0] / divisor;
  const v10 = source[y0 * width + x1] / divisor;
  const v01 = source[y1 * width + x0] / divisor;
  const v11 = source[y1 * width + x1] / divisor;
  const top = v00 + (v10 - v00) * tx;
  const bottom = v01 + (v11 - v01) * tx;
  return top + (bottom - top) * ty;
}

function getSourceLuminance() {
  if (sourceLuminance?.length === imageWidth * imageHeight) return sourceLuminance;
  sourceLuminance = new Float32Array(imageWidth * imageHeight);
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = imageWidth;
  sourceCanvas.height = imageHeight;
  const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
  sourceContext.drawImage(elements.original, 0, 0, imageWidth, imageHeight);
  const pixels = sourceContext.getImageData(0, 0, imageWidth, imageHeight).data;
  for (let index = 0; index < sourceLuminance.length; index += 1) {
    const offset = index * 4;
    sourceLuminance[index] = (pixels[offset] * 0.299 + pixels[offset + 1] * 0.587 + pixels[offset + 2] * 0.114) / 255;
  }
  return sourceLuminance;
}

function boxBlur(field, width, height, radius) {
  const temp = new Float32Array(field.length);
  const output = new Float32Array(field.length);
  const window = radius * 2 + 1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      for (let dx = -radius; dx <= radius; dx += 1) {
        const sampleX = Math.min(width - 1, Math.max(0, x + dx));
        sum += field[y * width + sampleX];
      }
      temp[y * width + x] = sum / window;
    }
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      for (let dy = -radius; dy <= radius; dy += 1) {
        const sampleY = Math.min(height - 1, Math.max(0, y + dy));
        sum += temp[sampleY * width + x];
      }
      output[y * width + x] = sum / window;
    }
  }

  return output;
}

function punchCurve(value) {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped * clamped * (3 - 2 * clamped);
}

function computeDepthStats() {
  if (!depthData?.length && !rawDepthData?.length) {
    depthStats = null;
    return;
  }
  const source = rawDepthData?.length ? rawDepthData : depthData;
  const divisor = rawDepthData?.length ? 1 : 255;
  const samples = new Float32Array(source.length);
  for (let index = 0; index < source.length; index += 1) samples[index] = source[index] / divisor;
  samples.sort();
  const lowIndex = Math.floor(samples.length * 0.03);
  const highIndex = Math.min(samples.length - 1, Math.ceil(samples.length * 0.97));
  depthStats = {
    low: samples[lowIndex],
    high: samples[highIndex],
  };
}

function normalizeRawDepth(value) {
  if (!depthStats) return value;
  const span = Math.max(0.001, depthStats.high - depthStats.low);
  return Math.max(0, Math.min(1, (value - depthStats.low) / span));
}

function applyTone(depth, preset = activePreset()) {
  const contrast = (Number(elements.contrast.value) / 100) * preset.contrast;
  let toned = (depth - 0.5) * contrast + 0.5;
  toned = Math.max(0, Math.min(1, toned));
  const gamma = Math.max(0.2, (Number(elements.gamma.value) / 100) * preset.gamma);
  toned = Math.pow(toned, 1 / gamma);
  if (preset.binary) toned = toned >= 0.5 ? 1 : 0;
  return toned;
}

function strengthenedDepthField(preset = activePreset()) {
  const strength = Number(elements.depthStrength.value) / 100;
  const definition = Number(elements.definition.value) / 100;
  const luminance = getSourceLuminance();
  const values = new Float32Array(imageWidth * imageHeight);
  const normalizedDepth = new Float32Array(imageWidth * imageHeight);

  for (let y = 0; y < imageHeight; y += 1) {
    for (let x = 0; x < imageWidth; x += 1) {
      let depth = normalizeRawDepth(sampleDepth(x, y));
      if (preset.invert) depth = 1 - depth;
      const index = y * imageWidth + x;
      normalizedDepth[index] = depth;
      values[index] = 0.5 + (depth - 0.5) * strength;
    }
  }

  const blurredDepthTight = boxBlur(values, imageWidth, imageHeight, 1);
  const blurredDepthWide = boxBlur(values, imageWidth, imageHeight, 3);
  const blurredLuminance = boxBlur(luminance, imageWidth, imageHeight, 4);
  const useCrispMask = elements.crispMask.checked;

  for (let index = 0; index < values.length; index += 1) {
    const foreground = normalizedDepth[index] > 0.08 ? 1 : 0;
    const detail = values[index] - blurredDepthTight[index];
    const macro = values[index] - blurredDepthWide[index];
    const sharpened = values[index] + definition * (1.55 * detail + 0.65 * macro);
    const textureHighPass = luminance[index] - blurredLuminance[index];
    const texture = Math.max(-0.18, Math.min(0.18, textureHighPass));
    values[index] = sharpened + foreground * definition * 0.35 * texture;
  }

  for (let index = 0; index < values.length; index += 1) {
    if (useCrispMask && normalizedDepth[index] < 0.06 && luminance[index] < 0.14) {
      values[index] = 0;
      continue;
    }
    if (useCrispMask && luminance[index] < 0.08 && values[index] < 0.48) values[index] = 0;
  }

  let rawMin = Infinity;
  let rawMax = -Infinity;
  for (let index = 0; index < values.length; index += 1) {
    if (values[index] <= 0.01) continue;
    rawMin = Math.min(rawMin, values[index]);
    rawMax = Math.max(rawMax, values[index]);
  }
  if (!Number.isFinite(rawMin)) {
    rawMin = 0;
    rawMax = 1;
  }

  const histogramBins = 1024;
  const histogram = new Uint32Array(histogramBins);
  const rawSpan = Math.max(0.0001, rawMax - rawMin);
  let nonZeroCount = 0;
  for (let index = 0; index < values.length; index += 1) {
    if (values[index] <= 0.01) continue;
    nonZeroCount += 1;
    const normalized = Math.max(0, Math.min(0.999999, (values[index] - rawMin) / rawSpan));
    histogram[Math.floor(normalized * histogramBins)] += 1;
  }
  const lowTarget = Math.floor(nonZeroCount * 0.01);
  const highTarget = Math.floor(nonZeroCount * 0.992);
  let cumulative = 0;
  let lowBin = 0;
  let highBin = histogramBins - 1;
  for (let bin = 0; bin < histogramBins; bin += 1) {
    cumulative += histogram[bin];
    if (cumulative >= lowTarget) {
      lowBin = bin;
      break;
    }
  }
  cumulative = 0;
  for (let bin = 0; bin < histogramBins; bin += 1) {
    cumulative += histogram[bin];
    if (cumulative >= highTarget) {
      highBin = bin;
      break;
    }
  }
  const min = rawMin + (lowBin / histogramBins) * rawSpan;
  const max = rawMin + (highBin / histogramBins) * rawSpan;
  const span = Math.max(0.0001, max - min);
  for (let index = 0; index < values.length; index += 1) {
    if (values[index] <= 0.01) {
      values[index] = 0;
      continue;
    }
    values[index] = punchCurve((values[index] - min) / span);
  }

  return { values, min: 0, span: 1 };
}

function turboRgb(depth) {
  const hue = (1 - depth) * 0.72;
  const saturation = 0.92;
  const lightness = 0.18 + depth * 0.62;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const huePrime = hue * 6;
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1));
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (huePrime < 1) [r1, g1, b1] = [chroma, x, 0];
  else if (huePrime < 2) [r1, g1, b1] = [x, chroma, 0];
  else if (huePrime < 3) [r1, g1, b1] = [0, chroma, x];
  else if (huePrime < 4) [r1, g1, b1] = [0, x, chroma];
  else if (huePrime < 5) [r1, g1, b1] = [x, 0, chroma];
  else [r1, g1, b1] = [chroma, 0, x];
  const match = lightness - chroma / 2;
  return [
    Math.round((r1 + match) * 255),
    Math.round((g1 + match) * 255),
    Math.round((b1 + match) * 255),
  ];
}

function colormapRgb(depth, preset = activePreset()) {
  if (preset.id === 'turbo') return turboRgb(depth);
  const shade = Math.round(depth * 255);
  return [shade, shade, shade];
}

function buildPixels(preset = activePreset(), kind = 'depth') {
  const pixels = new Uint8ClampedArray(imageWidth * imageHeight * 4);
  const blend = Number(elements.blend.value) / 100;
  const { values, min, span } = strengthenedDepthField(preset);
  let sourcePixels = null;

  if (kind === 'overlay') {
    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = imageWidth;
    sourceCanvas.height = imageHeight;
    const sourceContext = sourceCanvas.getContext('2d');
    sourceContext.drawImage(elements.original, 0, 0, imageWidth, imageHeight);
    sourcePixels = sourceContext.getImageData(0, 0, imageWidth, imageHeight).data;
  }

  for (let index = 0; index < values.length; index += 1) {
    const stretched = applyTone((values[index] - min) / span, preset);
    const [red, green, blue] = colormapRgb(stretched, preset);
    const pixel = index * 4;
    if (kind === 'depth') {
      pixels[pixel] = red;
      pixels[pixel + 1] = green;
      pixels[pixel + 2] = blue;
      pixels[pixel + 3] = 255;
    } else {
      pixels[pixel] = Math.round(sourcePixels[pixel] * (1 - blend) + red * blend);
      pixels[pixel + 1] = Math.round(sourcePixels[pixel + 1] * (1 - blend) + green * blend);
      pixels[pixel + 2] = Math.round(sourcePixels[pixel + 2] * (1 - blend) + blue * blend);
      pixels[pixel + 3] = 255;
    }
  }
  return pixels;
}

function renderDepth() {
  if (!depthData) return;
  const pixels = buildPixels();
  elements.canvas.getContext('2d').putImageData(new ImageData(pixels, imageWidth, imageHeight), 0, 0);
}

function setViewMode(mode) {
  if (!VIEW_MODES[mode]) return;
  viewMode = mode;
  elements.modeBw.classList.toggle('active', mode === 'bw');
  elements.modeRgb.classList.toggle('active', mode === 'rgb');
  elements.modeBw.setAttribute('aria-pressed', String(mode === 'bw'));
  elements.modeRgb.setAttribute('aria-pressed', String(mode === 'rgb'));
  renderDepth();
}

async function openFile(file) {
  if (!file?.type.startsWith('image/')) return showToast('Choose a JPG, PNG, or WEBP image.', true);
  if (file.size > 45 * 1024 * 1024) return showToast('This image is over the 45 MB browser limit.', true);

  if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  sourceFile = file;
  sourceUrl = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    if (image.naturalWidth * image.naturalHeight > 24_000_000) {
      showToast('For this MVP, use an image up to 24 megapixels.', true);
      return;
    }
    elements.original.src = sourceUrl;
    elements.fileName.textContent = file.name;
    elements.fileMeta.textContent = `${image.naturalWidth} × ${image.naturalHeight} · ${formatBytes(file.size)}`;
    elements.empty.classList.add('hidden');
    elements.canvasArea.classList.remove('hidden');
    elements.originalLayer.style.clipPath = 'inset(0 50% 0 0)';
    sourceWidth = image.naturalWidth;
    sourceHeight = image.naturalHeight;
    imageWidth = sourceWidth;
    imageHeight = sourceHeight;
    depthData = null;
    rawDepthData = null;
    rawDepthWidth = 0;
    rawDepthHeight = 0;
    depthStats = null;
    sourceLuminance = null;
    depthWidth = 0;
    depthHeight = 0;
    elements.canvas.width = imageWidth;
    elements.canvas.height = imageHeight;
    elements.refine.classList.add('disabled-panel');
    setExportDisabled(true);
    updateModelUI();
    requestAnimationFrame(fitStage);
    if (elements.autoEstimate.checked) setTimeout(() => estimateDepth(), 0);
  };
  image.src = sourceUrl;
}

function fitStage() {
  const bounds = elements.canvasArea.getBoundingClientRect();
  const ratio = sourceWidth / sourceHeight;
  let width = bounds.width;
  let height = width / ratio;
  if (height > bounds.height) {
    height = bounds.height;
    width = height * ratio;
  }
  elements.canvasArea.style.setProperty('--art-ratio', ratio);
  elements.canvasArea.style.setProperty('--art-width', `${Math.max(1, width)}px`);
  elements.canvasArea.style.setProperty('--art-height', `${Math.max(1, height)}px`);
}

async function estimateDepth() {
  if (!sourceFile || busy) return;
  busy = true;
  elements.busy.classList.remove('hidden');
  elements.busyTitle.textContent = 'Preparing depth mushrooms…';
  elements.busyDetail.textContent = 'First time is slower while the browser learns the spell. Later runs feel snappier.';
  elements.progress.style.width = '3%';
  elements.estimate.disabled = true;
  const buffer = await sourceFile.arrayBuffer();
  worker.postMessage({
    type: 'estimate',
    buffer,
    mimeType: sourceFile.type,
    model: elements.model.value,
    device: 'wasm',
  }, [buffer]);
}

worker.onmessage = ({ data }) => {
  if (data.type === 'progress') {
    elements.progress.style.width = `${Math.max(3, data.percent)}%`;
    if (data.status === 'progress') elements.busyDetail.textContent = funnyLoadDetail(data.percent);
    if (data.status === 'ready') elements.busyDetail.textContent = 'Spell cached — measuring near and far…';
  }
  if (data.type === 'phase') {
    elements.busyTitle.textContent = data.message;
    elements.progress.style.width = '92%';
  }
  if (data.type === 'result') {
    depthWidth = data.width;
    depthHeight = data.height;
    depthData = new Uint8Array(data.pixels);
    rawDepthData = data.rawDepth ? new Float32Array(data.rawDepth) : null;
    rawDepthWidth = data.rawWidth || depthWidth;
    rawDepthHeight = data.rawHeight || depthHeight;
    computeDepthStats();
    sourceLuminance = null;
    imageWidth = data.inputWidth;
    imageHeight = data.inputHeight;
    elements.canvas.width = imageWidth;
    elements.canvas.height = imageHeight;
    renderDepth();
    elements.progress.style.width = '100%';
    setTimeout(() => elements.busy.classList.add('hidden'), 350);
    busy = false;
    updateModelUI();
    elements.refine.classList.remove('disabled-panel');
    setExportDisabled(false);
    showToast('Depth map ready. Switch BW/RGB on the canvas and adjust depth amount.');
  }
  if (data.type === 'error') {
    busy = false;
    elements.busy.classList.add('hidden');
    updateModelUI();
    showToast(`Depth estimation failed on the CPU engine: ${data.message}`, true);
  }
};

function updateCompare() {
  const position = Number(elements.compare.value);
  elements.originalLayer.style.clipPath = `inset(0 ${100 - position}% 0 0)`;
  elements.handle.style.left = `${position}%`;
}

function buildDepthCanvas(kind, preset = activePreset()) {
  if (!depthData) return null;
  const pixels = buildPixels(preset, kind);
  const canvas = document.createElement('canvas');
  canvas.width = imageWidth;
  canvas.height = imageHeight;
  canvas.getContext('2d').putImageData(new ImageData(pixels, imageWidth, imageHeight), 0, 0);
  return canvas;
}

function downloadCanvas(canvas, suffix) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) return resolve();
      const link = document.createElement('a');
      const stem = sourceFile.name.replace(/\.[^.]+$/, '');
      link.download = `${stem}-${suffix}.png`;
      link.href = URL.createObjectURL(blob);
      link.click();
      setTimeout(() => {
        URL.revokeObjectURL(link.href);
        resolve();
      }, 250);
    }, 'image/png');
  });
}

async function downloadBothModes() {
  if (!depthData) return;
  showToast('Exporting BW and RGB depth maps…');
  for (const mode of ['bw', 'rgb']) {
    const canvas = buildDepthCanvas('depth', activePreset(mode));
    if (!canvas) continue;
    await downloadCanvas(canvas, `depth-${mode}`);
    await new Promise((resolve) => setTimeout(resolve, 180));
  }
  showToast('BW and RGB depth maps exported.');
}

function openPicker() { elements.fileInput.click(); }

elements.emptyUpload.addEventListener('click', openPicker);
elements.dropzone.addEventListener('click', openPicker);
elements.dropzone.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') openPicker(); });
elements.fileInput.addEventListener('change', () => openFile(elements.fileInput.files[0]));
elements.sample.addEventListener('click', async () => {
  const response = await fetch('../assets/defaults-basestatue.png');
  const blob = await response.blob();
  openFile(new File([blob], 'mapshroom-statue.png', { type: blob.type || 'image/png' }));
});
elements.estimate.addEventListener('click', estimateDepth);
elements.downloadDepth.addEventListener('click', () => {
  const canvas = buildDepthCanvas('depth');
  if (canvas) downloadCanvas(canvas, `depth-${viewMode}`);
});
elements.downloadAll.addEventListener('click', downloadBothModes);
elements.downloadOverlay.addEventListener('click', () => {
  const canvas = buildDepthCanvas('overlay');
  if (canvas) downloadCanvas(canvas, `depth-overlay-${viewMode}`);
});
elements.viewModeToggle.addEventListener('click', (event) => {
  const button = event.target.closest('.view-mode-dot');
  if (!button) return;
  setViewMode(button.dataset.mode);
});
elements.compare.addEventListener('input', updateCompare);
elements.model.addEventListener('change', () => {
  updateModelUI();
  if (sourceFile && elements.autoEstimate.checked && !busy) estimateDepth();
});
elements.autoEstimate.addEventListener('change', () => {
  if (elements.autoEstimate.checked && sourceFile && !busy) estimateDepth();
});
elements.depthStrength.addEventListener('input', () => {
  $('#depthStrengthValue').value = `${elements.depthStrength.value}%`;
  renderDepth();
});
elements.definition.addEventListener('input', () => {
  $('#definitionValue').value = `${elements.definition.value}%`;
  renderDepth();
});
elements.crispMask.addEventListener('change', renderDepth);
elements.blend.addEventListener('input', () => {
  $('#blendValue').value = `${elements.blend.value}%`;
});

[['contrast', 'contrastValue', '%'], ['gamma', 'gammaValue', '%']].forEach(([key, outputId, suffix]) => {
  elements[key].addEventListener('input', () => {
    document.querySelector(`#${outputId}`).value = `${elements[key].value}${suffix}`;
    renderDepth();
  });
});

for (const target of [document.body, elements.dropzone]) {
  target.addEventListener('dragover', (event) => { event.preventDefault(); elements.dropOverlay.classList.add('visible'); });
  target.addEventListener('dragleave', (event) => { if (!event.relatedTarget || !document.body.contains(event.relatedTarget)) elements.dropOverlay.classList.remove('visible'); });
  target.addEventListener('drop', (event) => {
    event.preventDefault();
    elements.dropOverlay.classList.remove('visible');
    openFile(event.dataTransfer.files[0]);
  });
}

updateCompare();
updateModelUI();
setViewMode('bw');
window.addEventListener('resize', fitStage);
