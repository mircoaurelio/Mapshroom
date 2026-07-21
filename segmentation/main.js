const $ = (selector) => document.querySelector(selector);
const embeddedInMapshroom = new URLSearchParams(window.location.search).get('embed') === '1';

const elements = {
  fileInput: $('#fileInput'), dropzone: $('#dropzone'), emptyUpload: $('#emptyUploadButton'), sample: $('#sampleButton'),
  segment: $('#segmentButton'), downloadMask: $('#downloadMaskButton'), downloadComposite: $('#downloadCompositeButton'),
  undo: $('#undoButton'), redo: $('#redoButton'), canvas: $('#resultCanvas'), original: $('#originalImage'),
  originalLayer: $('#originalLayer'), compare: $('#compareRange'), handle: $('#compareHandle'), empty: $('#emptyState'),
  canvasArea: $('#canvasArea'), dropOverlay: $('#dropOverlay'), busy: $('#busyOverlay'), busyTitle: $('#busyTitle'),
  busyDetail: $('#busyDetail'), progress: $('#progressBar'), fileName: $('#fileName'), fileMeta: $('#fileMeta'),
  model: $('#modelSelect'), modelBadge: $('#modelBadge'), modelDescription: $('#modelDescription'),
  autoSegment: $('#autoSegment'),
  deviceLabel: $('#deviceLabel'), deviceToggle: $('#deviceToggle'), refine: $('#refinePanel'), toast: $('#toast'),
  threshold: $('#thresholdRange'), feather: $('#featherRange'), spill: $('#spillRange'), checkerboard: $('#checkerboard'),
  brushToggle: $('#brushToggle'), eraseBrush: $('#eraseBrush'), restoreBrush: $('#restoreBrush'),
  brushSize: $('#brushSizeRange'), brushCursor: $('#brushCursor'), resetBrush: $('#resetBrush'),
  magicErase: $('#magicErase'), magicTolerance: $('#magicToleranceRange'), magicSoftness: $('#magicSoftnessRange'),
  hardMask: $('#hardMaskToggle'),
  cropPanel: $('#cropPanel'), cropToggle: $('#cropToggle'), cropOverlay: $('#cropOverlay'), cropBox: $('#cropBox'),
  cropAspect: $('#cropAspect'), cropApply: $('#cropApply'), cropReset: $('#cropReset'), cropCancel: $('#cropCancel'), cropSize: $('#cropSizeValue'),
  wandPanel: $('#wandPanel'), wandToggle: $('#wandToggle'), wandCanvas: $('#wandCanvas'), wandSize: $('#wandSizeRange'),
  wandCancel: $('#wandCancel'), wandConfirm: $('#wandConfirm'), wandModeMinus: $('#wandModeMinus'), wandModePlus: $('#wandModePlus'),
  drawPanel: $('#drawPanel'), drawToggle: $('#drawToggle'), drawColor: $('#drawColor'), drawSize: $('#drawSizeRange'), resetDraw: $('#resetDraw'),
  depthPanel: $('#depthPanel'), generateDepth: $('#generateDepth'), depthModeBw: $('#depthModeBw'), depthModeRgb: $('#depthModeRgb'),
  depthStrength: $('#depthStrengthRange'), depthDefinition: $('#depthDefinitionRange'), depthContrast: $('#depthContrastRange'),
  depthGamma: $('#depthGammaRange'), depthInvert: $('#depthInvert'), depthStatus: $('#depthStatus'),
};

const modelInfo = {
  manual: ['NO DOWNLOAD', 'Click connected background regions or paint the mask manually.'],
  'onnx-community/ormbg-ONNX': ['CPU TESTED', 'A practical default for sculptures, paintings and mixed artwork.'],
  'onnx-community/BiRefNet_lite-ONNX': ['DETAIL', 'Sharper boundaries for complex silhouettes and fine art details.'],
  'onnx-community/BEN2-ONNX': ['LARGE MODEL', 'Maximum-quality matte; expect a substantial first download.'],
  'Xenova/modnet': ['FAST', 'A lightweight model tuned primarily for people and portraits.'],
};

let sourceFile = null;
let sourceUrl = '';
let basePixels = null;
let sourcePixels = null;
let maskBaseline = null;
let renderedPixels = null;
let imageWidth = 0;
let imageHeight = 0;
let sourceWidth = 1;
let sourceHeight = 1;
let busy = false;
let brushActive = false;
let magicEraseActive = false;
let brushAction = 'erase';
let painting = false;
let previousBrushPoint = null;
let hardMaskEnabled = false;
let cropActive = false;
let cropRect = { x: 0.08, y: 0.08, width: 0.84, height: 0.84 };
let cropDrag = null;
let wandActive = false;
let wandDrawing = false;
let wandPoints = [];
let previousWandPoint = null;
let wandAction = 'minus';
let pendingWandAction = 'minus';
let drawActive = false;
let drawBaselinePixels = null;
let depthData = null;
let depthWidth = 0;
let depthHeight = 0;
let depthMode = 'bw';
let depthPreviewActive = false;
let toastTimer;
let undoStack = [];
let redoStack = [];
let historyBytes = 0;
let restoringHistory = false;
const historyByteLimit = 96 * 1024 * 1024;

const worker = new Worker(new URL('./segmenter.worker.js', import.meta.url), { type: 'module' });
const depthWorker = new Worker(new URL('../depthmap/depth.worker.js', import.meta.url), { type: 'module' });

elements.deviceLabel.textContent = 'WASM · CPU safe mode';

function updateModelUI() {
  const manual = elements.model.value === 'manual';
  const [badge, description] = modelInfo[elements.model.value];
  elements.modelBadge.textContent = badge;
  elements.modelDescription.textContent = description;
  elements.segment.disabled = manual || !sourceFile;
  elements.segment.textContent = manual ? 'Model-free tools ready' : 'Remove background ✦';
  elements.deviceToggle.disabled = true;
  elements.deviceToggle.textContent = 'CPU SAFE';
  elements.deviceLabel.textContent = manual
    ? 'No AI runtime needed'
    : 'WASM · CPU safe mode';
}

function selectedDevice() {
  return 'wasm';
}

function showToast(message, isError = false) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.toggle('error', isError);
  elements.toast.classList.add('visible');
  toastTimer = setTimeout(() => elements.toast.classList.remove('visible'), 4200);
}

function notifyMapshroom(status, message, resultKind = null) {
  if (!embeddedInMapshroom || window.parent === window) return;
  window.parent.postMessage({ type: 'mapshroom:status', status, message, resultKind }, window.location.origin);
}

function selectEmbeddedPanel(panel) {
  if (!embeddedInMapshroom) return;
  if (panel !== 'crop' && cropActive) setCropActive(false);
  if (panel !== 'wand' && wandActive) setWandActive(false);
  if (panel !== 'draw' && drawActive) setDrawActive(false);
  if (panel !== 'depth' && depthPreviewActive) {
    depthPreviewActive = false;
    renderMask();
  }
  if (panel !== 'refine') {
    setBrushActive(false);
    setMagicEraseActive(false);
  }
  document.body.dataset.editorPanel = panel;
  document.querySelectorAll('[data-editor-panel]').forEach((button) => {
    button.classList.toggle('active', button.dataset.editorPanel === panel);
  });
  if (panel === 'draw' && sourceFile) setDrawActive(true);
  if (panel === 'depth') setDepthPreviewActive(true);
  if (!['draw', 'depth'].includes(panel) && sourceFile) notifyMapshroom('ready', 'Mask tools ready.', 'mask');
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function setExportDisabled(disabled) {
  elements.downloadMask.disabled = disabled;
  elements.downloadComposite.disabled = disabled;
}

function alphaChannel(pixels) {
  const alpha = new Uint8ClampedArray(pixels.length / 4);
  for (let source = 3, target = 0; source < pixels.length; source += 4, target += 1) alpha[target] = pixels[source];
  return alpha;
}

function pixelsWithAlpha(rgbPixels, alpha) {
  const pixels = new Uint8ClampedArray(rgbPixels);
  for (let source = 0, target = 3; source < alpha.length; source += 1, target += 4) pixels[target] = alpha[source];
  return pixels;
}

function captureState(label) {
  const pixels = new Uint8ClampedArray(basePixels);
  const baselinePixels = new Uint8ClampedArray(maskBaseline || basePixels);
  return {
    label, pixels, baselinePixels, sourcePixels, imageWidth, imageHeight, sourceWidth, sourceHeight,
    fileName: sourceFile?.name || 'artwork.png', bytes: pixels.byteLength + baselinePixels.byteLength,
  };
}

function updateHistoryButtons() {
  elements.undo.disabled = undoStack.length === 0 || restoringHistory;
  elements.redo.disabled = redoStack.length === 0 || restoringHistory;
}

function clearHistory() {
  undoStack = [];
  redoStack = [];
  historyBytes = 0;
  updateHistoryButtons();
}

function commitHistory(label) {
  if (!basePixels || restoringHistory) return;
  const state = captureState(label);
  undoStack.push(state);
  historyBytes += state.bytes;
  redoStack = [];
  while (historyBytes > historyByteLimit && undoStack.length > 1) {
    const removed = undoStack.shift();
    historyBytes -= removed.bytes;
  }
  updateHistoryButtons();
}

async function restoreState(state) {
  restoringHistory = true;
  updateHistoryButtons();
  sourcePixels = state.sourcePixels;
  imageWidth = state.imageWidth;
  imageHeight = state.imageHeight;
  sourceWidth = state.sourceWidth;
  sourceHeight = state.sourceHeight;
  basePixels = new Uint8ClampedArray(state.pixels);
  maskBaseline = new Uint8ClampedArray(state.baselinePixels);
  drawBaselinePixels = null;
  elements.canvas.width = imageWidth;
  elements.canvas.height = imageHeight;
  elements.wandCanvas.width = imageWidth;
  elements.wandCanvas.height = imageHeight;
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = imageWidth;
  sourceCanvas.height = imageHeight;
  sourceCanvas.getContext('2d').putImageData(new ImageData(sourcePixels, imageWidth, imageHeight), 0, 0);
  const blob = await new Promise((resolve) => sourceCanvas.toBlob(resolve, 'image/png'));
  if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  sourceFile = new File([blob], state.fileName, { type: 'image/png' });
  sourceUrl = URL.createObjectURL(blob);
  elements.original.src = sourceUrl;
  elements.fileName.textContent = state.fileName;
  elements.fileMeta.textContent = `${imageWidth} × ${imageHeight} · ${formatBytes(blob.size)}`;
  clearWandSelection();
  setCropActive(false);
  renderMask();
  requestAnimationFrame(fitStage);
  restoringHistory = false;
  updateHistoryButtons();
}

async function undo() {
  if (!undoStack.length || restoringHistory || busy) return;
  const target = undoStack.pop();
  historyBytes -= target.bytes;
  redoStack.push(captureState(target.label));
  await restoreState(target);
  showToast(`Undid ${target.label}.`);
}

async function redo() {
  if (!redoStack.length || restoringHistory || busy) return;
  const target = redoStack.pop();
  const current = captureState(target.label);
  undoStack.push(current);
  historyBytes += current.bytes;
  await restoreState(target);
  showToast(`Redid ${target.label}.`);
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
    updateModelUI();
    elements.downloadMask.disabled = true;
    elements.downloadComposite.disabled = true;
    sourceWidth = image.naturalWidth;
    sourceHeight = image.naturalHeight;
    imageWidth = sourceWidth;
    imageHeight = sourceHeight;
    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = imageWidth;
    sourceCanvas.height = imageHeight;
    const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
    sourceContext.drawImage(image, 0, 0);
    sourcePixels = sourceContext.getImageData(0, 0, imageWidth, imageHeight).data;
    basePixels = new Uint8ClampedArray(sourcePixels);
    maskBaseline = new Uint8ClampedArray(basePixels);
    drawBaselinePixels = null;
    depthData = null;
    depthWidth = 0;
    depthHeight = 0;
    clearHistory();
    elements.canvas.width = imageWidth;
    elements.canvas.height = imageHeight;
    elements.wandCanvas.width = imageWidth;
    elements.wandCanvas.height = imageHeight;
    clearWandSelection();
    setWandActive(false);
    elements.refine.classList.remove('disabled-panel');
    elements.cropPanel.classList.remove('disabled-panel');
    elements.wandPanel.classList.remove('disabled-panel');
    elements.drawPanel.classList.remove('disabled-panel');
    elements.depthPanel.classList.remove('disabled-panel');
    elements.generateDepth.disabled = false;
    elements.depthStatus.textContent = 'Ready to generate from the loaded photo.';
    setExportDisabled(false);
    renderMask();
    cropRect = { x: 0.08, y: 0.08, width: 0.84, height: 0.84 };
    setCropActive(false);
    requestAnimationFrame(fitStage);
    notifyMapshroom('ready', 'Image loaded. Adjust the mask or wait for automatic removal.');
    if (elements.autoSegment.checked && elements.model.value !== 'manual') {
      setTimeout(() => segment(), 0);
    }
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

async function segment() {
  if (!sourceFile || busy) return;
  busy = true;
  elements.busy.classList.remove('hidden');
  elements.busyTitle.textContent = 'Waking the mask mushrooms…';
  elements.busyDetail.textContent = 'They are arguing politely about which pixels are background.';
  elements.progress.style.width = '3%';
  elements.segment.disabled = true;
  notifyMapshroom('processing', 'Removing the background with the selected model…');
  await runSegmentation(selectedDevice());
}

async function runSegmentation(device) {
  const buffer = await sourceFile.arrayBuffer();
  worker.postMessage({ type: 'segment', buffer, mimeType: sourceFile.type, model: elements.model.value, device }, [buffer]);
}

worker.onmessage = ({ data }) => {
  if (data.type === 'progress') {
    elements.progress.style.width = `${Math.max(3, data.percent)}%`;
    if (data.status === 'progress') elements.busyDetail.textContent = `Downloading ${data.file || 'model'} · ${data.percent}%`;
    if (data.status === 'ready') elements.busyDetail.textContent = 'Almost there — the stubborn edge pixels are negotiating.';
  }
  if (data.type === 'phase') {
    elements.busyTitle.textContent = data.message.includes('Loading') ? 'Waking the mask mushrooms…' : 'Sorting brave pixels from background pixels…';
    elements.progress.style.width = '92%';
  }
  if (data.type === 'sam-phase') {
    elements.busyTitle.textContent = data.message.startsWith('Loading') ? 'Giving the AI wand a tiny espresso…' : 'The wand is consulting its pixel oracle…';
    elements.progress.style.width = data.message.startsWith('Loading') ? '12%' : '88%';
  }
  if (data.type === 'sam-result') {
    commitHistory(`AI wand ${pendingWandAction}`);
    const mask = new Uint8Array(data.mask);
    let removedPixels = 0;
    for (let y = 0; y < imageHeight; y += 1) {
      const maskY = Math.min(data.height - 1, Math.floor(y * data.height / imageHeight));
      for (let x = 0; x < imageWidth; x += 1) {
        const maskX = Math.min(data.width - 1, Math.floor(x * data.width / imageWidth));
        if (!mask[maskY * data.width + maskX]) continue;
        const pixelIndex = (y * imageWidth + x) * 4;
        if (pendingWandAction === 'minus') {
          basePixels[pixelIndex + 3] = 0;
        } else {
          basePixels[pixelIndex] = sourcePixels[pixelIndex];
          basePixels[pixelIndex + 1] = sourcePixels[pixelIndex + 1];
          basePixels[pixelIndex + 2] = sourcePixels[pixelIndex + 2];
          basePixels[pixelIndex + 3] = sourcePixels[pixelIndex + 3];
        }
        removedPixels += 1;
      }
    }
    maskBaseline = new Uint8ClampedArray(basePixels);
    drawBaselinePixels = null;
    renderMask();
    clearWandSelection();
    setWandActive(false);
    elements.wandModeMinus.disabled = false;
    elements.wandModePlus.disabled = false;
    busy = false;
    elements.progress.style.width = '100%';
    setTimeout(() => elements.busy.classList.add('hidden'), 300);
    const coverage = (removedPixels / (imageWidth * imageHeight) * 100).toFixed(1);
    const operation = pendingWandAction === 'minus' ? 'removed' : 'restored';
    showToast(`AI selection confirmed and ${operation} (${coverage}% · confidence ${Math.round(data.score * 100)}%).`);
    notifyMapshroom('ready', 'AI selection applied. The masked asset is ready.');
  }
  if (data.type === 'result') {
    commitHistory('AI background removal');
    imageWidth = data.width;
    imageHeight = data.height;
    basePixels = new Uint8ClampedArray(data.pixels);
    maskBaseline = new Uint8ClampedArray(basePixels);
    drawBaselinePixels = null;
    elements.canvas.width = imageWidth;
    elements.canvas.height = imageHeight;
    renderMask();
    elements.progress.style.width = '100%';
    setTimeout(() => elements.busy.classList.add('hidden'), 350);
    updateModelUI();
    setExportDisabled(false);
    elements.refine.classList.remove('disabled-panel');
    busy = false;
    showToast('Artwork isolated. Refine the edge or export the PNG.');
    notifyMapshroom('ready', 'Background removed. Refine the mask or use the asset.');
  }
  if (data.type === 'error') {
    busy = false;
    elements.busy.classList.add('hidden');
    if (data.job === 'sam') {
      elements.wandConfirm.disabled = wandPoints.length === 0;
      elements.wandModeMinus.disabled = false;
      elements.wandModePlus.disabled = false;
      showToast(`AI Magic Wand failed: ${data.message}`, true);
      notifyMapshroom('ready', 'Magic Wand failed; manual mask tools remain available.');
      return;
    }
    updateModelUI();
    showToast(`Segmentation failed on the CPU engine: ${data.message}`, true);
    notifyMapshroom('ready', 'Automatic removal failed; use Smart Erase or the pencil tools.');
  }
};

function renderMask() {
  if (!basePixels) return;
  renderedPixels = new Uint8ClampedArray(basePixels);

  for (let i = 0; i < renderedPixels.length; i += 4) {
    refinePixel(i);
  }
  elements.canvas.getContext('2d').putImageData(new ImageData(renderedPixels, imageWidth, imageHeight), 0, 0);
}

function refinePixel(index) {
  const threshold = Number(elements.threshold.value) / 100 * 255;
  const feather = Math.max(1, Number(elements.feather.value) / 20 * 128);
  const spill = Number(elements.spill.value) / 100;
  renderedPixels[index] = basePixels[index];
  renderedPixels[index + 1] = basePixels[index + 1];
  renderedPixels[index + 2] = basePixels[index + 2];
  const alpha = basePixels[index + 3];
  const linearAlpha = Math.max(0, Math.min(1, (alpha - threshold) / feather));
  const softAlpha = linearAlpha * linearAlpha * (3 - 2 * linearAlpha) * 255;
  const refinedAlpha = hardMaskEnabled ? (alpha >= threshold ? 255 : 0) : softAlpha;
  renderedPixels[index + 3] = refinedAlpha;
  if (refinedAlpha > 0 && refinedAlpha < 245 && spill > 0) {
    const neutral = (renderedPixels[index] + renderedPixels[index + 1] + renderedPixels[index + 2]) / 3;
    const amount = spill * (1 - refinedAlpha / 255) * 0.45;
    renderedPixels[index] += (neutral - renderedPixels[index]) * amount;
    renderedPixels[index + 1] += (neutral - renderedPixels[index + 1]) * amount;
    renderedPixels[index + 2] += (neutral - renderedPixels[index + 2]) * amount;
  }
}

function renderMaskRegion(bounds) {
  if (!renderedPixels || !bounds) return;
  const left = Math.max(0, Math.floor(bounds.left));
  const right = Math.min(imageWidth - 1, Math.ceil(bounds.right));
  const top = Math.max(0, Math.floor(bounds.top));
  const bottom = Math.min(imageHeight - 1, Math.ceil(bounds.bottom));
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) refinePixel((y * imageWidth + x) * 4);
  }
  const imageData = new ImageData(renderedPixels, imageWidth, imageHeight);
  elements.canvas.getContext('2d').putImageData(imageData, 0, 0, left, top, right - left + 1, bottom - top + 1);
}

function sampleDepthValue(x, y) {
  const sampleX = Math.max(0, Math.min(depthWidth - 1, Math.round(x * depthWidth / imageWidth)));
  const sampleY = Math.max(0, Math.min(depthHeight - 1, Math.round(y * depthHeight / imageHeight)));
  return depthData[sampleY * depthWidth + sampleX] / 255;
}

function depthColor(value) {
  if (depthMode === 'bw') {
    const shade = Math.round(value * 255);
    return [shade, shade, shade];
  }
  const hue = (1 - value) * .72;
  const saturation = .92;
  const lightness = .18 + value * .62;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const huePrime = hue * 6;
  const cross = chroma * (1 - Math.abs((huePrime % 2) - 1));
  let red = 0; let green = 0; let blue = 0;
  if (huePrime < 1) [red, green, blue] = [chroma, cross, 0];
  else if (huePrime < 2) [red, green, blue] = [cross, chroma, 0];
  else if (huePrime < 3) [red, green, blue] = [0, chroma, cross];
  else if (huePrime < 4) [red, green, blue] = [0, cross, chroma];
  else if (huePrime < 5) [red, green, blue] = [cross, 0, chroma];
  else [red, green, blue] = [chroma, 0, cross];
  const match = lightness - chroma / 2;
  return [Math.round((red + match) * 255), Math.round((green + match) * 255), Math.round((blue + match) * 255)];
}

function renderDepthPreview() {
  if (!depthData?.length) return;
  const pixels = new Uint8ClampedArray(imageWidth * imageHeight * 4);
  const strength = Number(elements.depthStrength.value) / 100;
  const definition = Number(elements.depthDefinition.value) / 100;
  const contrast = Number(elements.depthContrast.value) / 100;
  const gamma = Math.max(.2, Number(elements.depthGamma.value) / 100);
  for (let y = 0; y < imageHeight; y += 1) {
    for (let x = 0; x < imageWidth; x += 1) {
      let depth = sampleDepthValue(x, y);
      if (elements.depthInvert.checked) depth = 1 - depth;
      const nearby = (sampleDepthValue(x - 2, y) + sampleDepthValue(x + 2, y) + sampleDepthValue(x, y - 2) + sampleDepthValue(x, y + 2)) / 4;
      depth = Math.max(0, Math.min(1, depth + (depth - nearby) * definition * 2.2));
      depth = Math.max(0, Math.min(1, .5 + (depth - .5) * strength));
      depth = Math.max(0, Math.min(1, (depth - .5) * contrast + .5));
      depth = Math.pow(depth, 1 / gamma);
      const [red, green, blue] = depthColor(depth);
      const index = (y * imageWidth + x) * 4;
      pixels[index] = red; pixels[index + 1] = green; pixels[index + 2] = blue; pixels[index + 3] = 255;
    }
  }
  renderedPixels = pixels;
  elements.canvas.getContext('2d').putImageData(new ImageData(pixels, imageWidth, imageHeight), 0, 0);
  elements.compare.value = '0';
  updateCompare();
}

function setDepthPreviewActive(active) {
  depthPreviewActive = active && Boolean(depthData?.length);
  if (depthPreviewActive) {
    renderDepthPreview();
    notifyMapshroom('ready', 'Depth map ready. Adjust it or save a depth copy.', 'depth');
  } else {
    renderMask();
  }
}

async function generateDepthMap() {
  if (!sourceFile || busy) return;
  busy = true;
  elements.busy.classList.remove('hidden');
  elements.busyTitle.textContent = 'Teaching the mushroom to see in 3D…';
  elements.busyDetail.textContent = 'Near, far, and everything dramatically in between.';
  elements.progress.style.width = '3%';
  elements.generateDepth.disabled = true;
  elements.depthStatus.textContent = 'Generating depth from the loaded photo…';
  notifyMapshroom('processing', 'Generating a depth map from the photo…', 'depth');
  const buffer = await sourceFile.arrayBuffer();
  depthWorker.postMessage({ type: 'estimate', buffer, mimeType: sourceFile.type, model: 'onnx-community/depth-anything-v2-small', device: 'wasm' }, [buffer]);
}

depthWorker.onmessage = ({ data }) => {
  if (data.type === 'progress') {
    elements.progress.style.width = `${Math.max(3, data.percent || 0)}%`;
    if (data.status === 'progress') elements.busyDetail.textContent = `Gathering 3D clues · ${data.percent}%`;
  } else if (data.type === 'phase') {
    elements.busyTitle.textContent = 'Measuring every pixel’s distance from destiny…';
    elements.progress.style.width = '92%';
  } else if (data.type === 'result') {
    depthData = new Uint8Array(data.pixels);
    depthWidth = data.width;
    depthHeight = data.height;
    depthPreviewActive = document.body.dataset.editorPanel === 'depth';
    busy = false;
    elements.generateDepth.disabled = false;
    elements.progress.style.width = '100%';
    elements.depthStatus.textContent = `Depth map ready · ${depthWidth} × ${depthHeight} analysis`;
    setTimeout(() => elements.busy.classList.add('hidden'), 300);
    if (depthPreviewActive) renderDepthPreview();
    else renderMask();
    showToast('Depth map ready. Adjust it, then save a new depth asset.');
    notifyMapshroom('ready', 'Depth map ready. Adjust it or save a depth copy.', 'depth');
  } else if (data.type === 'error') {
    busy = false;
    elements.busy.classList.add('hidden');
    elements.generateDepth.disabled = false;
    elements.depthStatus.textContent = 'Depth generation failed. The other tools are still available.';
    showToast(`Depth map failed: ${data.message}`, true);
    notifyMapshroom('ready', 'Depth generation failed; Mask and Draw remain available.', 'mask');
  }
};

function updateCompare() {
  const position = Number(elements.compare.value);
  elements.originalLayer.style.clipPath = `inset(0 ${100 - position}% 0 0)`;
  elements.handle.style.left = `${position}%`;
}

function renderCropFrame() {
  elements.cropBox.style.left = `${cropRect.x * 100}%`;
  elements.cropBox.style.top = `${cropRect.y * 100}%`;
  elements.cropBox.style.width = `${cropRect.width * 100}%`;
  elements.cropBox.style.height = `${cropRect.height * 100}%`;
  elements.cropSize.textContent = `${Math.max(1, Math.round(cropRect.width * imageWidth))} × ${Math.max(1, Math.round(cropRect.height * imageHeight))} px`;
}

function setCropActive(active) {
  if (active && drawActive) setDrawActive(false);
  cropActive = active;
  if (active) {
    setWandActive(false);
    setBrushActive(false);
    setMagicEraseActive(false);
    elements.compare.value = '0';
    updateCompare();
  }
  elements.canvasArea.classList.toggle('crop-active', active);
  elements.cropOverlay.setAttribute('aria-hidden', String(!active));
  elements.cropToggle.classList.toggle('active', active);
  elements.cropToggle.innerHTML = active ? '<span>⌗</span> Cropping' : '<span>⌗</span> Crop tool';
  elements.cropApply.disabled = !active;
  elements.cropCancel.disabled = !active;
  renderCropFrame();
}

function resetCropFrame() {
  const aspect = elements.cropAspect.value === 'free' ? null : Number(elements.cropAspect.value);
  if (!aspect) {
    cropRect = { x: 0.08, y: 0.08, width: 0.84, height: 0.84 };
  } else {
    const imageAspect = imageWidth / imageHeight;
    let width = 0.84;
    let height = width * imageAspect / aspect;
    if (height > 0.84) {
      height = 0.84;
      width = height * aspect / imageAspect;
    }
    cropRect = { x: (1 - width) / 2, y: (1 - height) / 2, width, height };
  }
  renderCropFrame();
}

function cropPixelBuffer(pixels, startX, startY, width, height, oldWidth) {
  const result = new Uint8ClampedArray(width * height * 4);
  for (let row = 0; row < height; row += 1) {
    const sourceStart = ((startY + row) * oldWidth + startX) * 4;
    result.set(pixels.subarray(sourceStart, sourceStart + width * 4), row * width * 4);
  }
  return result;
}

async function applyCrop() {
  if (!sourcePixels || !basePixels) return;
  commitHistory('crop');
  const oldWidth = imageWidth;
  const startX = Math.max(0, Math.floor(cropRect.x * imageWidth));
  const startY = Math.max(0, Math.floor(cropRect.y * imageHeight));
  const width = Math.max(1, Math.min(imageWidth - startX, Math.round(cropRect.width * imageWidth)));
  const height = Math.max(1, Math.min(imageHeight - startY, Math.round(cropRect.height * imageHeight)));
  sourcePixels = cropPixelBuffer(sourcePixels, startX, startY, width, height, oldWidth);
  basePixels = cropPixelBuffer(basePixels, startX, startY, width, height, oldWidth);
  maskBaseline = cropPixelBuffer(maskBaseline, startX, startY, width, height, oldWidth);
  imageWidth = width;
  imageHeight = height;
  sourceWidth = width;
  sourceHeight = height;
  elements.canvas.width = width;
  elements.canvas.height = height;
  elements.wandCanvas.width = width;
  elements.wandCanvas.height = height;

  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  sourceCanvas.getContext('2d').putImageData(new ImageData(sourcePixels, width, height), 0, 0);
  const blob = await new Promise((resolve) => sourceCanvas.toBlob(resolve, 'image/png'));
  if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  const originalName = sourceFile?.name?.replace(/\.[^.]+$/, '') || 'artwork';
  sourceFile = new File([blob], `${originalName}-crop.png`, { type: 'image/png' });
  sourceUrl = URL.createObjectURL(blob);
  elements.original.src = sourceUrl;
  elements.fileName.textContent = sourceFile.name;
  elements.fileMeta.textContent = `${width} × ${height} · ${formatBytes(blob.size)}`;
  renderMask();
  cropRect = { x: 0.08, y: 0.08, width: 0.84, height: 0.84 };
  setCropActive(false);
  requestAnimationFrame(fitStage);
  showToast(`Crop applied at ${width} × ${height} pixels.`);
}

function beginCropDrag(event) {
  if (!cropActive) return;
  event.preventDefault();
  const handle = event.target.dataset.cropHandle || 'move';
  cropDrag = { handle, startX: event.clientX, startY: event.clientY, startRect: { ...cropRect }, pointerId: event.pointerId };
  elements.cropOverlay.setPointerCapture(event.pointerId);
}

function moveCropDrag(event) {
  if (!cropDrag) return;
  const bounds = elements.cropOverlay.getBoundingClientRect();
  const dx = (event.clientX - cropDrag.startX) / bounds.width;
  const dy = (event.clientY - cropDrag.startY) / bounds.height;
  const start = cropDrag.startRect;
  const minimum = 0.035;
  let left = start.x;
  let top = start.y;
  let right = start.x + start.width;
  let bottom = start.y + start.height;
  if (cropDrag.handle === 'move') {
    left = Math.max(0, Math.min(1 - start.width, start.x + dx));
    top = Math.max(0, Math.min(1 - start.height, start.y + dy));
    right = left + start.width;
    bottom = top + start.height;
  } else {
    if (cropDrag.handle.includes('w')) left = Math.max(0, Math.min(right - minimum, start.x + dx));
    if (cropDrag.handle.includes('e')) right = Math.min(1, Math.max(left + minimum, start.x + start.width + dx));
    if (cropDrag.handle.includes('n')) top = Math.max(0, Math.min(bottom - minimum, start.y + dy));
    if (cropDrag.handle.includes('s')) bottom = Math.min(1, Math.max(top + minimum, start.y + start.height + dy));
  }
  cropRect = { x: left, y: top, width: right - left, height: bottom - top };
  renderCropFrame();
}

function clearWandSelection() {
  elements.wandCanvas.getContext('2d').clearRect(0, 0, elements.wandCanvas.width, elements.wandCanvas.height);
  wandPoints = [];
  previousWandPoint = null;
  elements.wandConfirm.disabled = true;
}

function setWandActive(active) {
  wandActive = active;
  if (active) {
    if (cropActive) setCropActive(false);
    setBrushActive(false);
    setMagicEraseActive(false);
    setDrawActive(false);
    elements.compare.value = '0';
    updateCompare();
  }
  elements.canvasArea.classList.toggle('wand-active', active);
  elements.wandToggle.classList.toggle('active', active);
  elements.wandToggle.querySelector('strong').textContent = active ? 'Drawing selection' : 'Draw AI selection';
  elements.brushCursor.classList.toggle('cursor-ai', active);
  if (!active) elements.brushCursor.classList.remove('visible', 'cursor-ai');
  elements.wandCancel.disabled = !active && wandPoints.length === 0;
  if (!active && wandPoints.length === 0) elements.wandConfirm.disabled = true;
}

function setWandAction(action) {
  if (wandAction === action) return;
  wandAction = action;
  clearWandSelection();
  elements.wandModeMinus.classList.toggle('active', action === 'minus');
  elements.wandModePlus.classList.toggle('active', action === 'plus');
  elements.wandConfirm.textContent = action === 'minus' ? 'Confirm removal' : 'Confirm restore';
  showToast(action === 'minus' ? 'Minus mode: select an area to remove.' : 'Plus mode: select an area to restore.');
}

function wandPoint(event) {
  const rect = elements.wandCanvas.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(imageWidth - 1, (event.clientX - rect.left) * imageWidth / rect.width)),
    y: Math.max(0, Math.min(imageHeight - 1, (event.clientY - rect.top) * imageHeight / rect.height)),
  };
}

function drawWandLine(from, to) {
  const context = elements.wandCanvas.getContext('2d');
  context.strokeStyle = wandAction === 'minus' ? 'rgba(168, 85, 247, 0.34)' : 'rgba(196, 181, 253, 0.34)';
  context.lineWidth = Number(elements.wandSize.value);
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.beginPath();
  context.moveTo(from.x, from.y);
  context.lineTo(to.x, to.y);
  context.stroke();

  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const sampleGap = Math.max(18, Number(elements.wandSize.value) * 0.55);
  const samples = Math.max(1, Math.ceil(distance / sampleGap));
  for (let index = 1; index <= samples; index += 1) {
    const amount = index / samples;
    wandPoints.push([from.x + (to.x - from.x) * amount, from.y + (to.y - from.y) * amount]);
  }
  elements.wandCancel.disabled = false;
  elements.wandConfirm.disabled = false;
}

async function confirmWandRemoval() {
  if (!sourceFile || wandPoints.length === 0 || busy) return;
  busy = true;
  elements.busy.classList.remove('hidden');
  elements.busyTitle.textContent = 'Giving the AI wand a tiny espresso…';
  elements.busyDetail.textContent = 'One dramatic pause while it studies your violet scribble.';
  elements.progress.style.width = '3%';
  elements.wandConfirm.disabled = true;
  elements.wandModeMinus.disabled = true;
  elements.wandModePlus.disabled = true;
  pendingWandAction = wandAction;
  const maximumPoints = 24;
  const step = Math.max(1, Math.ceil(wandPoints.length / maximumPoints));
  const points = wandPoints.filter((_, index) => index % step === 0).slice(0, maximumPoints);
  const buffer = await sourceFile.arrayBuffer();
  worker.postMessage({ type: 'sam-segment', buffer, mimeType: sourceFile.type, points }, [buffer]);
}

function setBrushActive(active) {
  if (active && drawActive) setDrawActive(false);
  brushActive = active;
  if (active) magicEraseActive = false;
  elements.canvasArea.classList.toggle('edit-active', active || magicEraseActive);
  elements.canvasArea.classList.toggle('brush-active', active);
  elements.brushToggle.innerHTML = `<span aria-hidden="true">✎</span> ${active ? 'PENCIL ON' : 'PENCIL OFF'}`;
  elements.brushToggle.classList.toggle('active', active);
  elements.brushCursor.classList.toggle('cursor-manual', active);
  if (!active) elements.brushCursor.classList.remove('visible', 'cursor-manual');
  elements.magicErase.classList.remove('active');
  if (active) {
    elements.compare.value = '0';
    updateCompare();
    showToast('Paint directly on the artwork. Use Erase or Restore to edit the mask.');
  }
}

function setMagicEraseActive(active) {
  if (active && drawActive) setDrawActive(false);
  magicEraseActive = active;
  if (active) brushActive = false;
  elements.canvasArea.classList.toggle('edit-active', active || brushActive);
  elements.canvasArea.classList.remove('brush-active');
  elements.brushToggle.innerHTML = '<span aria-hidden="true">✎</span> PENCIL OFF';
  elements.brushToggle.classList.remove('active');
  elements.magicErase.classList.toggle('active', active);
  elements.brushCursor.classList.remove('visible');
  if (active) {
    elements.compare.value = '0';
    updateCompare();
    showToast('Smart Erase active: click a connected background section.');
  }
}

function setDrawActive(active) {
  drawActive = active;
  if (active) {
    if (cropActive) setCropActive(false);
    if (wandActive) setWandActive(false);
    if (brushActive) setBrushActive(false);
    if (magicEraseActive) setMagicEraseActive(false);
    elements.compare.value = '0';
    updateCompare();
    showToast('Draw mode: paint mapping color directly onto the image.');
    notifyMapshroom('ready', 'Draw mode ready. Painted pixels will be included in the saved copy.', 'draw');
  }
  elements.canvasArea.classList.toggle('edit-active', active || brushActive || magicEraseActive);
  elements.canvasArea.classList.toggle('draw-active', active);
  elements.drawToggle.classList.toggle('active', active);
  elements.drawToggle.querySelector('strong').textContent = active ? 'Painting surface' : 'Paint surface';
  if (!active) elements.brushCursor.classList.remove('visible', 'cursor-draw');
}

function drawColorRgb() {
  const color = elements.drawColor.value.replace('#', '');
  return [parseInt(color.slice(0, 2), 16), parseInt(color.slice(2, 4), 16), parseInt(color.slice(4, 6), 16)];
}

function paintDrawCircle(point) {
  if (!basePixels) return null;
  const radius = Number(elements.drawSize.value) / 2;
  const left = Math.max(0, Math.floor(point.x - radius));
  const right = Math.min(imageWidth - 1, Math.ceil(point.x + radius));
  const top = Math.max(0, Math.floor(point.y - radius));
  const bottom = Math.min(imageHeight - 1, Math.ceil(point.y + radius));
  const softStart = radius * .82;
  const [red, green, blue] = drawColorRgb();
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      const distance = Math.hypot(x - point.x, y - point.y);
      if (distance > radius) continue;
      const strength = distance <= softStart ? 1 : 1 - (distance - softStart) / Math.max(1, radius - softStart);
      const index = (y * imageWidth + x) * 4;
      basePixels[index] += (red - basePixels[index]) * strength;
      basePixels[index + 1] += (green - basePixels[index + 1]) * strength;
      basePixels[index + 2] += (blue - basePixels[index + 2]) * strength;
      basePixels[index + 3] += (255 - basePixels[index + 3]) * strength;
    }
  }
  return { left, right, top, bottom };
}

function paintDrawLine(from, to) {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const step = Math.max(1, Number(elements.drawSize.value) / 5);
  const count = Math.max(1, Math.ceil(distance / step));
  let dirtyBounds = null;
  for (let index = 1; index <= count; index += 1) {
    const amount = index / count;
    const bounds = paintDrawCircle({ x: from.x + (to.x - from.x) * amount, y: from.y + (to.y - from.y) * amount });
    dirtyBounds = dirtyBounds
      ? { left: Math.min(dirtyBounds.left, bounds.left), right: Math.max(dirtyBounds.right, bounds.right), top: Math.min(dirtyBounds.top, bounds.top), bottom: Math.max(dirtyBounds.bottom, bounds.bottom) }
      : bounds;
  }
  renderMaskRegion(dirtyBounds);
}

function smartErase(point) {
  if (!basePixels || !sourcePixels) return;
  commitHistory('Smart Erase');
  const startX = Math.max(0, Math.min(imageWidth - 1, Math.round(point.x)));
  const startY = Math.max(0, Math.min(imageHeight - 1, Math.round(point.y)));
  const seedIndex = (startY * imageWidth + startX) * 4;
  const seedRed = sourcePixels[seedIndex];
  const seedGreen = sourcePixels[seedIndex + 1];
  const seedBlue = sourcePixels[seedIndex + 2];
  const tolerance = Number(elements.magicTolerance.value);
  const softness = Number(elements.magicSoftness.value);
  const visited = new Uint8Array(imageWidth * imageHeight);
  const stack = [startY * imageWidth + startX];
  let bounds = { left: startX, right: startX, top: startY, bottom: startY };
  let selectedCount = 0;

  const colorDistance = (pixel) => {
    const offset = pixel * 4;
    const red = sourcePixels[offset] - seedRed;
    const green = sourcePixels[offset + 1] - seedGreen;
    const blue = sourcePixels[offset + 2] - seedBlue;
    return Math.sqrt(red * red + green * green + blue * blue) / 4.416;
  };
  const matches = (pixel) => pixel >= 0 && pixel < visited.length && !visited[pixel] && colorDistance(pixel) <= tolerance;

  while (stack.length) {
    const seed = stack.pop();
    if (!matches(seed)) continue;
    const y = Math.floor(seed / imageWidth);
    let x = seed % imageWidth;
    while (x > 0 && matches(y * imageWidth + x - 1)) x -= 1;
    let aboveOpen = false;
    let belowOpen = false;
    for (; x < imageWidth; x += 1) {
      const pixel = y * imageWidth + x;
      if (!matches(pixel)) break;
      visited[pixel] = 1;
      selectedCount += 1;
      const distance = colorDistance(pixel);
      const strength = softness === 0 ? 1 : Math.max(0.08, Math.min(1, (tolerance - distance) / softness));
      const alphaIndex = pixel * 4 + 3;
      basePixels[alphaIndex] = Math.round(basePixels[alphaIndex] * (1 - strength));
      bounds.left = Math.min(bounds.left, x); bounds.right = Math.max(bounds.right, x);
      bounds.top = Math.min(bounds.top, y); bounds.bottom = Math.max(bounds.bottom, y);

      const above = pixel - imageWidth;
      if (y > 0 && matches(above)) {
        if (!aboveOpen) stack.push(above);
        aboveOpen = true;
      } else aboveOpen = false;
      const below = pixel + imageWidth;
      if (y < imageHeight - 1 && matches(below)) {
        if (!belowOpen) stack.push(below);
        belowOpen = true;
      } else belowOpen = false;
    }
  }
  renderMaskRegion(bounds);
  const percent = ((selectedCount / (imageWidth * imageHeight)) * 100).toFixed(1);
  showToast(`Smart Erase removed a connected region (${percent}% of the image).`);
}

function setBrushAction(action) {
  brushAction = action;
  elements.eraseBrush.classList.toggle('active', action === 'erase');
  elements.restoreBrush.classList.toggle('active', action === 'restore');
}

function brushPoint(event) {
  const rect = elements.canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * imageWidth / rect.width,
    y: (event.clientY - rect.top) * imageHeight / rect.height,
  };
}

function paintCircle(point) {
  if (!basePixels || !sourcePixels) return null;
  const radius = Number(elements.brushSize.value) / 2;
  const left = Math.max(0, Math.floor(point.x - radius));
  const right = Math.min(imageWidth - 1, Math.ceil(point.x + radius));
  const top = Math.max(0, Math.floor(point.y - radius));
  const bottom = Math.min(imageHeight - 1, Math.ceil(point.y + radius));
  const softStart = radius * 0.78;

  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      const distance = Math.hypot(x - point.x, y - point.y);
      if (distance > radius) continue;
      const strength = distance <= softStart ? 1 : 1 - (distance - softStart) / (radius - softStart);
      const index = (y * imageWidth + x) * 4;
      if (brushAction === 'erase') {
        basePixels[index + 3] = Math.round(basePixels[index + 3] * (1 - strength));
      } else {
        basePixels[index] = sourcePixels[index];
        basePixels[index + 1] = sourcePixels[index + 1];
        basePixels[index + 2] = sourcePixels[index + 2];
        basePixels[index + 3] = Math.round(basePixels[index + 3] + (sourcePixels[index + 3] - basePixels[index + 3]) * strength);
      }
    }
  }
  return { left, right, top, bottom };
}

function paintLine(from, to) {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const step = Math.max(1, Number(elements.brushSize.value) / 5);
  const count = Math.max(1, Math.ceil(distance / step));
  let dirtyBounds = null;
  for (let index = 1; index <= count; index += 1) {
    const amount = index / count;
    const bounds = paintCircle({ x: from.x + (to.x - from.x) * amount, y: from.y + (to.y - from.y) * amount });
    if (!bounds) continue;
    dirtyBounds = dirtyBounds
      ? { left: Math.min(dirtyBounds.left, bounds.left), right: Math.max(dirtyBounds.right, bounds.right), top: Math.min(dirtyBounds.top, bounds.top), bottom: Math.max(dirtyBounds.bottom, bounds.bottom) }
      : bounds;
  }
  renderMaskRegion(dirtyBounds);
}

function updateToolCursor(event, tool) {
  const isAi = tool === 'ai';
  const isDraw = tool === 'draw';
  if ((isAi && !wandActive) || (isDraw && !drawActive) || (!isAi && !isDraw && !brushActive)) return;
  const areaRect = elements.canvasArea.getBoundingClientRect();
  const targetCanvas = isAi ? elements.wandCanvas : elements.canvas;
  const canvasRect = targetCanvas.getBoundingClientRect();
  const brushSize = Number(isAi ? elements.wandSize.value : isDraw ? elements.drawSize.value : elements.brushSize.value);
  const screenSize = Math.max(8, brushSize * canvasRect.width / imageWidth);
  elements.brushCursor.style.width = `${screenSize}px`;
  elements.brushCursor.style.height = `${screenSize}px`;
  elements.brushCursor.style.left = `${event.clientX - areaRect.left}px`;
  elements.brushCursor.style.top = `${event.clientY - areaRect.top}px`;
  elements.brushCursor.classList.toggle('cursor-ai', isAi);
  elements.brushCursor.classList.toggle('cursor-manual', !isAi && !isDraw);
  elements.brushCursor.classList.toggle('cursor-draw', isDraw);
  elements.brushCursor.style.color = isDraw ? elements.drawColor.value : '';
  elements.brushCursor.classList.add('visible');
}

function downloadCanvas(canvas, suffix) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const link = document.createElement('a');
    const stem = sourceFile.name.replace(/\.[^.]+$/, '');
    link.download = `${stem}-${suffix}.png`;
    link.href = URL.createObjectURL(blob);
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }, 'image/png');
}

function buildBinaryExport(kind) {
  if (!renderedPixels || !sourcePixels) return null;
  const pixels = new Uint8ClampedArray(imageWidth * imageHeight * 4);
  const background = elements.checkerboard.dataset.background;
  const backgroundRgb = background === 'white'
    ? [255, 255, 255]
    : background === 'green'
      ? [184, 255, 60]
      : [0, 0, 0];
  for (let index = 0; index < pixels.length; index += 4) {
    const kept = renderedPixels[index + 3] >= 128;
    if (kind === 'mask') {
      const value = kept ? 255 : 0;
      pixels[index] = value;
      pixels[index + 1] = value;
      pixels[index + 2] = value;
    } else {
      pixels[index] = kept ? renderedPixels[index] : backgroundRgb[0];
      pixels[index + 1] = kept ? renderedPixels[index + 1] : backgroundRgb[1];
      pixels[index + 2] = kept ? renderedPixels[index + 2] : backgroundRgb[2];
    }
    pixels[index + 3] = 255;
  }
  const canvas = document.createElement('canvas');
  canvas.width = imageWidth;
  canvas.height = imageHeight;
  canvas.getContext('2d').putImageData(new ImageData(pixels, imageWidth, imageHeight), 0, 0);
  return canvas;
}

function downloadMask() {
  const canvas = buildBinaryExport('mask');
  if (canvas) downloadCanvas(canvas, 'mask');
}

function downloadComposite() {
  const canvas = buildBinaryExport('composite');
  if (canvas) downloadCanvas(canvas, 'original-black-mask');
}

async function sendCompositeToMapshroom() {
  if (!embeddedInMapshroom || busy) {
    notifyMapshroom(busy ? 'processing' : 'error', busy ? 'Wait for the current AI operation to finish.' : 'Mask Studio is unavailable.');
    return;
  }
  const canvas = buildBinaryExport('composite');
  if (!canvas) {
    notifyMapshroom('error', 'Load an image before applying the mask.');
    return;
  }
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) {
    notifyMapshroom('error', 'The masked image could not be created.');
    return;
  }
  const buffer = await blob.arrayBuffer();
  window.parent.postMessage(
    {
      type: 'mapshroom:segmentation-result',
      mimeType: 'image/png',
      resultKind: depthPreviewActive && depthData?.length ? 'depth' : drawBaselinePixels ? 'draw' : 'mask',
      buffer,
    },
    window.location.origin,
    [buffer],
  );
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
elements.segment.addEventListener('click', segment);
elements.downloadMask.addEventListener('click', downloadMask);
elements.downloadComposite.addEventListener('click', downloadComposite);
elements.undo.addEventListener('click', undo);
elements.redo.addEventListener('click', redo);
elements.cropToggle.addEventListener('click', () => setCropActive(!cropActive));
elements.cropReset.addEventListener('click', resetCropFrame);
elements.cropCancel.addEventListener('click', () => { setCropActive(false); showToast('Crop cancelled.'); });
elements.cropAspect.addEventListener('change', resetCropFrame);
elements.cropApply.addEventListener('click', applyCrop);
elements.cropBox.addEventListener('pointerdown', beginCropDrag);
elements.cropOverlay.addEventListener('pointermove', moveCropDrag);
elements.cropOverlay.addEventListener('pointerup', () => { cropDrag = null; });
elements.cropOverlay.addEventListener('pointercancel', () => { cropDrag = null; });
elements.wandToggle.addEventListener('click', () => setWandActive(!wandActive));
elements.wandModeMinus.addEventListener('click', () => setWandAction('minus'));
elements.wandModePlus.addEventListener('click', () => setWandAction('plus'));
elements.wandCancel.addEventListener('click', () => {
  clearWandSelection();
  setWandActive(false);
  showToast('AI selection cancelled.');
});
elements.wandConfirm.addEventListener('click', confirmWandRemoval);
elements.wandSize.addEventListener('input', () => { $('#wandSizeValue').value = `${elements.wandSize.value} px`; });
elements.wandCanvas.addEventListener('pointerdown', (event) => {
  if (!wandActive) return;
  event.preventDefault();
  wandDrawing = true;
  elements.wandCanvas.setPointerCapture(event.pointerId);
  previousWandPoint = wandPoint(event);
  drawWandLine(previousWandPoint, previousWandPoint);
});
elements.wandCanvas.addEventListener('pointermove', (event) => {
  updateToolCursor(event, 'ai');
  if (!wandDrawing || !wandActive) return;
  const point = wandPoint(event);
  drawWandLine(previousWandPoint, point);
  previousWandPoint = point;
});
elements.wandCanvas.addEventListener('pointerup', () => { wandDrawing = false; previousWandPoint = null; });
elements.wandCanvas.addEventListener('pointercancel', () => { wandDrawing = false; previousWandPoint = null; });
elements.wandCanvas.addEventListener('pointerenter', (event) => updateToolCursor(event, 'ai'));
elements.wandCanvas.addEventListener('pointerleave', () => elements.brushCursor.classList.remove('visible'));
elements.brushToggle.addEventListener('click', () => setBrushActive(!brushActive));
elements.drawToggle.addEventListener('click', () => setDrawActive(!drawActive));
elements.drawSize.addEventListener('input', () => { $('#drawSizeValue').value = `${elements.drawSize.value} px`; });
elements.drawColor.addEventListener('input', () => { elements.brushCursor.style.color = elements.drawColor.value; });
elements.resetDraw.addEventListener('click', () => {
  if (!drawBaselinePixels) return;
  commitHistory('drawing reset');
  basePixels = new Uint8ClampedArray(drawBaselinePixels);
  drawBaselinePixels = null;
  renderMask();
  showToast('Surface drawing reset.');
});
elements.generateDepth.addEventListener('click', generateDepthMap);
elements.depthModeBw.addEventListener('click', () => {
  depthMode = 'bw';
  elements.depthModeBw.classList.add('active');
  elements.depthModeRgb.classList.remove('active');
  if (depthPreviewActive) renderDepthPreview();
});
elements.depthModeRgb.addEventListener('click', () => {
  depthMode = 'rgb';
  elements.depthModeRgb.classList.add('active');
  elements.depthModeBw.classList.remove('active');
  if (depthPreviewActive) renderDepthPreview();
});
[
  ['depthStrength', 'depthStrengthValue'],
  ['depthDefinition', 'depthDefinitionValue'],
  ['depthContrast', 'depthContrastValue'],
  ['depthGamma', 'depthGammaValue'],
].forEach(([key, outputId]) => {
  elements[key].addEventListener('input', () => {
    $(`#${outputId}`).value = `${elements[key].value}%`;
    if (depthPreviewActive) renderDepthPreview();
  });
});
elements.depthInvert.addEventListener('change', () => { if (depthPreviewActive) renderDepthPreview(); });
elements.magicErase.addEventListener('click', () => setMagicEraseActive(!magicEraseActive));
elements.eraseBrush.addEventListener('click', () => setBrushAction('erase'));
elements.restoreBrush.addEventListener('click', () => setBrushAction('restore'));
elements.brushSize.addEventListener('input', () => {
  $('#brushSizeValue').value = `${elements.brushSize.value} px`;
});
elements.resetBrush.addEventListener('click', () => {
  if (!maskBaseline) return;
  commitHistory('manual edit reset');
  basePixels = new Uint8ClampedArray(maskBaseline);
  renderMask();
  showToast('Manual mask edits reset.');
});
elements.hardMask.addEventListener('click', () => {
  hardMaskEnabled = !hardMaskEnabled;
  elements.hardMask.textContent = hardMaskEnabled ? 'ON' : 'OFF';
  elements.hardMask.classList.toggle('active', hardMaskEnabled);
  elements.hardMask.setAttribute('aria-pressed', String(hardMaskEnabled));
  elements.feather.disabled = hardMaskEnabled;
  if (hardMaskEnabled && Number(elements.threshold.value) < 35) {
    elements.threshold.value = '35';
    $('#thresholdValue').value = '35%';
  }
  if (hardMaskEnabled) {
    document.querySelectorAll('.swatch').forEach((item) => item.classList.toggle('active', item.dataset.background === 'black'));
    elements.checkerboard.dataset.background = 'black';
  }
  renderMask();
  showToast(hardMaskEnabled ? 'Hard mask enabled: alpha is now fully opaque or transparent.' : 'Soft alpha edges restored.');
});
elements.canvas.addEventListener('pointerdown', (event) => {
  if ((!brushActive && !magicEraseActive && !drawActive) || !basePixels) return;
  event.preventDefault();
  if (magicEraseActive) {
    smartErase(brushPoint(event));
    return;
  }
  if (drawActive) {
    if (!drawBaselinePixels) drawBaselinePixels = new Uint8ClampedArray(basePixels);
    commitHistory('surface drawing stroke');
    painting = true;
    elements.canvas.setPointerCapture(event.pointerId);
    previousBrushPoint = brushPoint(event);
    renderMaskRegion(paintDrawCircle(previousBrushPoint));
    return;
  }
  commitHistory(`${brushAction} brush stroke`);
  painting = true;
  elements.canvas.setPointerCapture(event.pointerId);
  previousBrushPoint = brushPoint(event);
  renderMaskRegion(paintCircle(previousBrushPoint));
});
elements.canvas.addEventListener('pointermove', (event) => {
  updateToolCursor(event, drawActive ? 'draw' : 'manual');
  if (!painting || (!brushActive && !drawActive)) return;
  const point = brushPoint(event);
  if (drawActive) paintDrawLine(previousBrushPoint, point);
  else paintLine(previousBrushPoint, point);
  previousBrushPoint = point;
});
elements.canvas.addEventListener('pointerup', () => { painting = false; previousBrushPoint = null; });
elements.canvas.addEventListener('pointercancel', () => { painting = false; previousBrushPoint = null; });
elements.canvas.addEventListener('pointerleave', () => elements.brushCursor.classList.remove('visible'));
elements.canvas.addEventListener('pointerenter', (event) => updateToolCursor(event, drawActive ? 'draw' : 'manual'));
elements.compare.addEventListener('input', updateCompare);
elements.model.addEventListener('change', () => {
  updateModelUI();
  if (sourceFile && elements.autoSegment.checked && elements.model.value !== 'manual' && !busy) segment();
});
elements.autoSegment.addEventListener('change', () => {
  if (elements.autoSegment.checked && sourceFile && elements.model.value !== 'manual' && !busy) segment();
});

document.addEventListener('keydown', (event) => {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
  const key = event.key.toLowerCase();
  if (key === 'z') {
    event.preventDefault();
    if (event.shiftKey) redo(); else undo();
  } else if (key === 'y') {
    event.preventDefault();
    redo();
  }
});

[['threshold', 'thresholdValue', '%'], ['feather', 'featherValue', ' px'], ['spill', 'spillValue', '%']].forEach(([key, outputId, suffix]) => {
  elements[key].addEventListener('input', () => {
    document.querySelector(`#${outputId}`).value = `${elements[key].value}${suffix}`;
    renderMask();
  });
});

[['magicTolerance', 'magicToleranceValue'], ['magicSoftness', 'magicSoftnessValue']].forEach(([key, outputId]) => {
  elements[key].addEventListener('input', () => { document.querySelector(`#${outputId}`).value = elements[key].value; });
});

document.querySelectorAll('.swatch').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('.swatch').forEach((item) => item.classList.remove('active'));
  button.classList.add('active');
  elements.checkerboard.dataset.background = button.dataset.background;
}));

for (const target of [document.body, elements.dropzone]) {
  target.addEventListener('dragover', (event) => { event.preventDefault(); elements.dropOverlay.classList.add('visible'); });
  target.addEventListener('dragleave', (event) => { if (!event.relatedTarget || !document.body.contains(event.relatedTarget)) elements.dropOverlay.classList.remove('visible'); });
  target.addEventListener('drop', (event) => {
    event.preventDefault();
    elements.dropOverlay.classList.remove('visible');
    openFile(event.dataTransfer.files[0]);
  });
}

window.addEventListener('message', (event) => {
  if (!embeddedInMapshroom || event.origin !== window.location.origin || event.source !== window.parent) return;
  if (event.data?.type === 'mapshroom:load-image' && event.data.buffer instanceof ArrayBuffer) {
    const file = new File(
      [event.data.buffer],
      event.data.name || 'mapshroom-asset.png',
      { type: event.data.mimeType || 'image/png' },
    );
    void openFile(file);
  } else if (event.data?.type === 'mapshroom:request-segmentation-result') {
    void sendCompositeToMapshroom();
  }
});

if (embeddedInMapshroom) {
  document.body.classList.add('embedded-in-mapshroom');
  selectEmbeddedPanel('refine');
  document.querySelectorAll('[data-editor-panel]').forEach((button) => {
    button.addEventListener('click', () => selectEmbeddedPanel(button.dataset.editorPanel));
  });
  window.parent.postMessage({ type: 'mapshroom:ready' }, window.location.origin);
}

updateCompare();
updateModelUI();
window.addEventListener('resize', fitStage);
